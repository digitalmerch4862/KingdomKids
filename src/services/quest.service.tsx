import { QuestStory } from '../types'; 

export const QuestService = {
  async generateStory(studentId: string): Promise<QuestStory> {
    try {
      // 1. This connects to your secure Vercel Backend
      // It DOES NOT use the API Key directly, so it won't crash!
      const response = await fetch('/api/quest');

      // 2. Check if the connection worked
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();

      // 3. Check if the server sent back an error message
      if (data.error) {
        throw new Error(data.error);
      }

      return data as QuestStory;

    } catch (error) {
      console.error("Quest Service Failed:", error);
      
      // 4. SAFETY FALLBACK
      // If anything fails, return this "Lost Sheep" story instead of crashing to a white screen.
      return {
        title: "The Lost Sheep",
        content: "Jesus told a story about a shepherd who had 100 sheep. One day, one got lost! The shepherd left the 99 to find the one lost sheep.\n\nHe searched high and low until he found it. He was so happy! He carried it home on his shoulders.\n\nThis story shows us how much God loves each one of us.",
        quiz: [{
          q: "How many sheep did the shepherd have?",
          options: ["50", "100", "10"],
          a: "100"
        }]
      };
    }
  },

  async completeQuest(studentId: string) {
    console.log("Quest completed");
    return true;
  }
};