
import { db } from './db.service';
import { MinistryService } from './ministry.service';

export interface QuestStory {
  title: string;
  content: string;
  quiz: { q: string; options: string[]; a: string }[];
  topic: string;
}

export class QuestService {
  static async generateStory(studentId: string): Promise<QuestStory> {
    try {
      // 1. Fetch Student Data (Client-side DB)
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

      // 4. Call Backend API
      const params = new URLSearchParams({
        rank,
        ageGroup: student.ageGroup,
        history: history.join(',')
      });

      const response = await fetch(`/api/quest?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();

      // 5. Save Topic (Client-side DB)
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
      console.error("Quest Generation Error (Using Fallback):", e);
      
      // FALLBACK STORY
      return {
        title: "The Lost Sheep",
        content: "Jesus told a story about a shepherd who had 100 sheep. One day, one got lost! The shepherd left the 99 to find the one lost sheep.\n\nHe searched high and low until he found it. He was so happy! He carried it home on his shoulders.\n\nThis story shows us how much God loves each one of us.",
        quiz: [{
          q: "How many sheep did the shepherd have?",
          options: ["50", "100", "10"],
          a: "100"
        }],
        topic: "The Lost Sheep"
      };
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
