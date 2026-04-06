import { GoogleGenAI, Type } from "@google/genai";
import { Bet, Match } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const generateDailyBets = async (isVip: boolean = false): Promise<Bet[]> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analise os jogos de futebol de hoje (${new Date().toLocaleDateString()}) e forneça 3 tipos de apostas:
  1. Aposta Individual Segura: Odd entre 1.50 e 2.00 (Marcar como isVip: false).
  2. Aposta Múltipla Segura: Combinada entre 1.75 e 2.25 (Marcar como isVip: false).
  3. Bingo Diário: Odd 10+ (Marcar como isVip: true).
  
  Para cada aposta, inclua o título, uma análise técnica profunda baseada em estatísticas de escanteios, gols e probabilidade de vitória, e os detalhes dos jogos (times, liga, palpite, odd, horário).
  
  Cruze os dados dos sites fornecidos no contexto (Oddspedia, CornerProBet, 365Scores) para selecionar as melhores odds e probabilidades.
  
  Retorne os dados em formato JSON estruturado seguindo exatamente o esquema fornecido.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [
          { googleSearch: {} },
          { 
            urlContext: { 
              urls: [
                "https://oddspedia.com",
                "https://cornerprobet.com",
                "https://www.365scores.com"
              ]
            } 
          }
        ],
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
      }
    });

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
