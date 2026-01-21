
export interface QuestStory {
  title: string;
  content: string;
  quiz: { q: string; options: string[]; a: string }[];
  topic: string;
}

export class QuestService {
  static async generateStory(studentId: string): Promise<QuestStory> {
     throw new Error("Daily Quest feature has been removed.");
  }

  static async completeQuest(studentId: string) {
     throw new Error("Daily Quest feature has been removed.");
  }
}
