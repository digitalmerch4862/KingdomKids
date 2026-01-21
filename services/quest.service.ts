
import { GoogleGenAI, Type } from "@google/genai";
import { db } from './db.service';
import { MinistryService } from './ministry.service';

// Initialize the API using the Vite environment variable with safe access
const getApiKey = (): string => {
  // Use optional chaining to prevent crash if import.meta.env is undefined
  const viteEnv = import.meta.env?.VITE_GOOGLE_API_KEY;
  if (viteEnv) return viteEnv as string;

  // Fallback for environments where process.env is polyfilled
  try {
    // @ts-ignore
    return process.env.VITE_GOOGLE_API_KEY || '';
  } catch {
    return '';
  }
};

const API_KEY = getApiKey();

export interface QuestStory {
  title: string;
  content: string;
  quiz: { q: string; options: string[]; a: string }[];
  topic: string;
}

export class QuestService {
  static async generateStory(studentId: string): Promise<QuestStory> {
    if (!API_KEY) {
      throw new Error("Missing VITE_GOOGLE_API_KEY in environment variables");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // 1. Fetch Student
    const student = await db.getStudentById(studentId);
    if (!student) throw new Error("Student not found");

    // 2. Fetch/Calculate Rank (Simulating kingdom_kids_profiles.current_rank by points)
    const leaderboard = await MinistryService.getLeaderboard(student.ageGroup);
    const entry = leaderboard.find(e => e.id === studentId);
    const totalPoints = entry?.totalPoints || 0;
    
    // Rank Logic
    let rank = 'Seed'; // Default
    if (totalPoints >= 100) rank = 'Sprout';
    if (totalPoints >= 300) rank = 'Rooted';
    if (totalPoints >= 600) rank = 'Branch';
    if (totalPoints >= 1000) rank = 'Fruit Bearer';

    // 3. Fetch History from Supabase
    const history = await db.getStoryHistory(studentId);

    // 4. Gemini Generation
    const prompt = `
      Create a NEW Bible story for a child.
      Profile:
      - Rank: ${rank} (Adjust theological depth: Seed=Simple/Literal, Fruit Bearer=Application/Deeper Meaning)
      - Age Group: ${student.ageGroup}
      
      EXCLUDE these past topics: ${history.join(', ')}.
      
      Return JSON:
      - title: Fun title
      - content: Story body (max 200 words, engaging for kids)
      - quiz: 3 multiple choice questions
      - story_topic: Unique 1-3 word identifier for this story topic (e.g. "Daniel Lions", "Moses Red Sea").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  q: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  a: { type: Type.STRING }
                },
                required: ["q", "options", "a"]
              }
            },
            story_topic: { type: Type.STRING }
          },
          required: ["title", "content", "quiz", "story_topic"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);

    // 5. Save Topic to Supabase to prevent repeats
    if (data.story_topic) {
      // We don't await this to keep UI snappy, unless strict consistency is needed
      db.addStoryHistory(studentId, data.story_topic).catch(console.error);
    }

    return {
      title: data.title,
      content: data.content,
      quiz: data.quiz,
      topic: data.story_topic
    };
  }

  static async completeQuest(studentId: string) {
    // 1. Award Points
    await MinistryService.addPoints(studentId, 'Daily Quest', 5, 'System', 'Completed Daily Quest');
    
    // 2. Client-side state update for visual plant progress
    const key = `km_plant_${studentId}`;
    const today = new Date().toDateString();
    localStorage.setItem(`${key}_last_water`, today);
    
    // Update Plant Progress
    const saved = localStorage.getItem(key);
    let stage = 0;
    let rankIndex = 0;
    
    if (saved) {
      const data = JSON.parse(saved);
      stage = data.stage;
      rankIndex = data.rank;
    }

    const PLANT_STAGES = ['Seed', 'Sprout', 'Rooted', 'Branch', 'Fruit Bearer'];
    let newStage = stage + 20;
    let newRankIndex = rankIndex;

    if (newStage >= 100) {
      newStage = 0;
      newRankIndex = Math.min(rankIndex + 1, PLANT_STAGES.length - 1);
    }
    
    localStorage.setItem(key, JSON.stringify({ stage: newStage, rank: newRankIndex }));
    return { newStage, newRankIndex };
  }
}
