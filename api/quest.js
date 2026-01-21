
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Initialize Client
  // CRITICAL: Ensure GOOGLE_API_KEY is set in Vercel Project Settings
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("Server Error: GOOGLE_API_KEY is missing");
    return res.status(500).json({ error: "Server misconfiguration: API Key missing" });
  }

  const ai = new GoogleGenAI({ apiKey });

  // 2. Parse Parameters
  const { rank = 'Seed', ageGroup = '3-6', history = '' } = req.query;
  const historyList = history ? history.split(',') : [];

  // 3. Construct Prompt
  const promptText = `
    Create a NEW Bible story for a child.
    Profile:
    - Rank: ${rank} (Adjust theological depth: Seed=Simple, Fruit Bearer=Deeper)
    - Age Group: ${ageGroup}
    
    EXCLUDE past topics: ${historyList.join(', ')}.
    
    Format: JSON only.
  `;

  try {
    // 4. Call Gemini
    // Using gemini-3-flash-preview as per project standards
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

    let text = response.text;
    
    // 5. Clean & Parse JSON
    // Remove markdown code blocks if present (though responseMimeType usually handles this)
    if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const data = JSON.parse(text);
    return res.status(200).json(data);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to generate story" 
    });
  }
}
