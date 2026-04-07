import { GoogleGenAI, Type } from "@google/genai";
import { Bet, Match } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is missing! Check your Netlify environment variables.");
}
const ai = new GoogleGenAI({ apiKey });

export const generateDailyBets = async (isVip: boolean = false): Promise<Bet[]> => {
  const model = "gemini-3-flash-preview";
  
  // Get current time in Brasilia
  const now = new Date();
  const brasiliaTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false
  }).format(now);
  
  const currentHour = parseInt(brasiliaTime);
  const targetDate = new Date(now);
  
  // If after 16:00 BRT, look for tomorrow's matches
  if (currentHour >= 16) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  
  const dateStr = targetDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  const prompt = `VOCÊ É UM ANALISTA PROFISSIONAL DE APOSTAS ESPORTIVAS (BETTING EXPERT).
  DATA ALVO: ${dateStr} (Fuso Horário: Brasília/Brasil).
  
  SUA MISSÃO:
  1. Use o Google Search para encontrar jogos REAIS de futebol que acontecem na data ${dateStr}.
  2. VALIDE as odds em sites como Bet365, Betano ou Oddspedia. NÃO invente odds.
  3. Se o horário atual em Brasília for após as 16:00, foque EXCLUSIVAMENTE nos jogos do dia seguinte (${dateStr}).
  4. NÃO gere jogos que já começaram ou terminaram.
  5. Se não encontrar jogos reais com odds confirmadas, retorne um array vazio [].
  
  CATEGORIAS:
  - single: Odd 1.50 a 2.00 (Segura).
  - multi: Combinada de 2-3 jogos, Odd total ~2.00.
  - bingo: Odd 10.00+ (Alta análise).
  
  RETORNO: Apenas o JSON puro, sem explicações.`;

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
        { 
          googleSearch: {
            // No specific config needed, it will use the prompt to search
          } 
        }
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
