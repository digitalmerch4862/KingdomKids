import { GoogleGenAI, Type } from "@google/genai";

// 1. Corrected initialization for Vite projects
// IMPORTANT: Ensure VITE_GOOGLE_API_KEY is set in your Vercel/local .env
const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY 
});

export class FaceService {
  static async generateEmbedding(base64Image: string): Promise<number[]> {
    try {
      // 2. Updated model to Gemini 3 Flash Preview (standard for 2026)
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
            { text: "Generate a unique 128-float array representation (embedding) of the person's face in this image. Ensure the output is JUST a JSON array of 128 floats." }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          // 3. Optional: Add thinking level for higher accuracy
          thinkingLevel: "MEDIUM",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER }
          }
        }
      });

      const text = response.text || "[]";
      // The new SDK handles JSON cleaning better, but we keep the fallback
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const arr = JSON.parse(jsonStr);
      
      if (!Array.isArray(arr)) throw new Error("Gemini did not return an array");
      
      const result = arr.slice(0, 128).map(v => typeof v === 'number' ? v : 0);
      while (result.length < 128) result.push(0);
      return result;
    } catch (error) {
      console.error("Embedding Error:", error);
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
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [{
            text: `You are a friendly and encouraging mentor for a child in 'Kingdom Kids' church ministry. 
            The child, ${name}, has ${points} points and is ranked #${rank} in the ${ageGroup} age group. 
            Give 3 short, specific, fun, and biblical tips on how they can earn more points 
            (like memorizing verses, helping others, being early, or participation) and grow in their faith. 
            Keep the output in ALL CAPS, very positive, and kid-friendly (short sentences).`
          }]
        }]
      });
      return response.text || "KEEP SHINING FOR JESUS! YOU ARE DOING AMAZING!";
    } catch (e) {
      return "KEEP ATTENDING AND MEMORIZING VERSES TO CLIMB THE LEADERBOARD!";
    }
  }
}