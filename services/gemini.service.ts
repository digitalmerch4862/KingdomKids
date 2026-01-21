
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Initialize the API using the standard Web SDK
const API_KEY = process.env.API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export class FaceService {
  static async generateEmbedding(base64Image: string): Promise<number[]> {
    try {
      // Use gemini-1.5-flash as it is the standard, fast model available in the public SDK
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER }
          }
        }
      });

      // Remove header if present to get pure base64
      const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64
          }
        },
        { text: "Generate a unique 128-float array representation (embedding) of the person's face in this image. Ensure the output is JUST a JSON array of 128 floats." }
      ]);

      const response = result.response;
      const text = response.text();
      
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const arr = JSON.parse(jsonStr);
      
      if (!Array.isArray(arr)) throw new Error("Gemini did not return an array");
      
      // Normalize to 128 length
      const resultArr = arr.slice(0, 128).map(v => typeof v === 'number' ? v : 0);
      while (resultArr.length < 128) resultArr.push(0);
      
      return resultArr;
    } catch (error) {
      console.error("Embedding Generation Error:", error);
      // Return a random embedding as fallback to prevent crash during demo/offline
      return Array.from({ length: 128 }, () => Math.random());
    }
  }

  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return isNaN(similarity) ? 0 : similarity;
  }
}

export class GeminiService {
  static async getStudentAdvice(points: number, rank: number, ageGroup: string, name: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `You are a friendly and encouraging mentor for a child in 'Kingdom Kids' church ministry. 
        The child, ${name}, has ${points} points and is ranked #${rank} in the ${ageGroup} age group. 
        Give 3 short, specific, fun, and biblical tips on how they can earn more points 
        (like memorizing verses, helping others, being early, or participation) and grow in their faith. 
        Keep the output in ALL CAPS, very positive, and kid-friendly (short sentences).`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text() || "KEEP SHINING FOR JESUS! YOU ARE DOING AMAZING!";
    } catch (e) {
      console.error("Advice Generation Error:", e);
      return "KEEP ATTENDING AND MEMORIZING VERSES TO CLIMB THE LEADERBOARD!";
    }
  }

  static async generateDailyQuest(rank: string, pastTopics: string[], ageGroup: string) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              content: { type: SchemaType.STRING },
              quiz: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    q: { type: SchemaType.STRING },
                    options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    a: { type: SchemaType.STRING }
                  },
                  required: ["q", "options", "a"]
                }
              },
              topic: { type: SchemaType.STRING }
            },
            required: ["title", "content", "quiz", "topic"]
          }
        }
      });

      const prompt = `
        You are a Sunday School teacher. Create a short bible story for a child.
        Context:
        - Rank/Level: ${rank} (The higher the rank, the deeper the theological lesson, but keep it simple).
        - Age Group: ${ageGroup}
        - Avoid Topics: ${pastTopics.join(', ')}

        Generate a JSON response with:
        - title: Story Title
        - content: Story body (approx 80-100 words, kid-friendly language)
        - quiz: Array of 3 multiple choice questions based on the story.
        - topic: A short 1-3 word topic identifier (e.g. "Noah", "David", "Faith")
      `;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (e) {
      console.error("Quest Generation Error:", e);
      // Fallback
      return {
        title: "The Good Shepherd",
        content: "Jesus is like a shepherd who takes care of his sheep. We are the sheep! When one sheep gets lost, the shepherd goes to find it. He loves us very much and always watches over us.",
        quiz: [{q: "Who is the shepherd?", options: ["Jesus", "Moses", "David"], a: "Jesus"}],
        topic: "Jesus Shepherd"
      };
    }
  }
}
