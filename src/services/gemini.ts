import { GoogleGenAI, Type } from "@google/genai";
import { Bet, Match } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is missing! Check your Netlify environment variables.");
}
const ai = new GoogleGenAI({ apiKey });

export const generateDailyBets = async (isVip: boolean = false): Promise<Bet[]> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analise os jogos de futebol de hoje (${new Date().toLocaleDateString()}) baseando-se nas informações dos sites:
  - https://oddspedia.com
  - https://cornerprobet.com
  - https://www.365scores.com
  
  Forneça 3 tipos de apostas:
  1. Aposta Individual Segura: Odd entre 1.50 e 2.00 (isVip: false).
  2. Aposta Múltipla Segura: Combinada entre 1.75 e 2.25 (isVip: false).
  3. Bingo Diário: Odd 10+ (isVip: true).
  
  Para cada aposta, inclua o título, uma análise técnica profunda e os detalhes dos jogos.
  Retorne os dados em formato JSON estruturado seguindo o esquema fornecido.`;

  const generateWithConfig = async (useTools: boolean) => {
    const config: any = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["single", "multi", "bingo"] },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            odds: { type: Type.NUMBER },
            analysis: { type: Type.STRING },
            isVip: { type: Type.BOOLEAN },
            matches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  homeTeam: { type: Type.STRING },
                  awayTeam: { type: Type.STRING },
                  league: { type: Type.STRING },
                  prediction: { type: Type.STRING },
                  odds: { type: Type.NUMBER },
                  time: { type: Type.STRING }
                },
                required: ["homeTeam", "awayTeam", "league", "prediction", "odds", "time"]
              }
            }
          },
          required: ["type", "title", "description", "odds", "analysis", "matches", "isVip"]
        }
      }
    };

    if (useTools) {
      config.tools = [
        { googleSearch: {} },
        { urlContext: {} }
      ];
    }

    return await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });
  };

  try {
    let response;
    try {
      // Try with tools first
      response = await generateWithConfig(true);
    } catch (e) {
      console.warn("Gemini tools failed, falling back to base model:", e);
      // Fallback without tools
      response = await generateWithConfig(false);
    }

    const bets: Bet[] = JSON.parse(response.text || "[]").map((b: any) => ({
      ...b,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      result: 'pending'
    }));

    return bets;
  } catch (error) {
    console.error("Error generating bets:", error);
    return [];
  }
};
