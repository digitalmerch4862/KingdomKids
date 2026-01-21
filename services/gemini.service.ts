
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Initialize the API using the Vite environment variable with safe access
const getApiKey = (): string => {
  // Use optional chaining to handle cases where import.meta.env might be undefined
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

export class FaceService {
  static async generateEmbedding(base64Image: string): Promise<number[]> {
    if (!API_KEY) {
      console.error("VITE_GOOGLE_API_KEY is missing");
      // Fallback for demo without key
      return Array.from({ length: 128 }, () => Math.random());
    }

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      // Remove header if present to get pure base64
      const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

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
    if (!API_KEY) return "KEEP SHINING FOR JESUS! (ADD API KEY TO ENABLE AI ADVICE)";

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
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
}
