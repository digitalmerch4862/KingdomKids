import { GoogleGenAI, Type } from "@google/genai";
import { db } from './db.service';
import { MinistryService } from './ministry.service';

// Initialize the API using the environment variable per strict guidelines
const getApiKey = (): string => {
  // 1. Priority: process.env.API_KEY (Strict Guideline Requirement)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore error if process is undefined
  }

  // 2. Fallback: Vite Environment Variable
  if (import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) {
    return import.meta.env.VITE_GOOGLE_API_KEY as string;
  }
  
  return '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export interface QuestStory {
  title: string;
  content: string;
  quiz: { q: string; options: string[]; a: string }[];
  topic: string;
}

export class QuestService {
  static async generateStory(studentId: string): Promise<QuestStory> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Missing API Key. Ensure process.env.API_KEY or VITE_GOOGLE_API_KEY is set.");
    }

    // 1. Fetch Student Data
    const student = await db.getStudentById(studentId);
    if (!student) throw new Error("Student not found");

    // 2. Determine Rank
    const leaderboard = await MinistryService.getLeaderboard(student.ageGroup);
    const entry = leaderboard.find(e => e.id === studentId);
    const totalPoints = entry?.totalPoints || 0;
    
    let rank = 'Seed';
    if (totalPoints >= 100) rank = 'Sprout';
    if (totalPoints >= 300) rank = 'Rooted';
    if (totalPoints >= 600) rank = 'Branch';
    if (totalPoints >= 1000) rank = 'Fruit Bearer';

    // 3. Fetch History
    const history = await db.getStoryHistory(studentId);

    // 4. Generate Content
    const promptText = `
      Create a NEW Bible story for a child.
      Profile:
      - Rank: ${rank} (Adjust theological depth: Seed=Simple, Fruit Bearer=Deeper)
      - Age Group: ${student.ageGroup}
      
      EXCLUDE past topics: ${history.join(', ')}.
      
      Format: JSON only.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: promptText,
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

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const data = JSON.parse(text);

      // 5. Save Topic
      if (data.story_topic) {
        db.addStoryHistory(studentId, data.story_topic).catch(console.error);
      }

      return {
        title: data.title,
        content: data.content,
        quiz: data.quiz,
        topic: data.story_topic
      };
    } catch (e: any) {
      console.error("Gemini Error:", e);
      throw new Error(`AI Generation Failed: ${e.message || 'Unknown error'}`);
    }
  }

  static async completeQuest(studentId: string) {
    await MinistryService.addPoints(studentId, 'Daily Quest', 5, 'System', 'Completed Daily Quest');
    const key = `km_plant_${studentId}`;
    localStorage.setItem(`${key}_last_water`, new Date().toDateString());
    
    // Update visual plant stage
    const saved = localStorage.getItem(key);
    let stage = 0;
    let rankIndex = 0;
    if (saved) {
      const data = JSON.parse(saved);
      stage = data.stage;
      rankIndex = data.rank;
    }
    
    let newStage = stage + 20;
    let newRankIndex = rankIndex;
    if (newStage >= 100) {
      newStage = 0;
      newRankIndex = Math.min(rankIndex + 1, 4);
    }
    
    localStorage.setItem(key, JSON.stringify({ stage: newStage, rank: newRankIndex }));
    return { newStage, newRankIndex };
  }
}