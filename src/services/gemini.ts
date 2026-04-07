import { GoogleGenAI, Type } from "@google/genai";
import { Bet, Match } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is missing! Check your Netlify environment variables.");
}
const ai = new GoogleGenAI({ apiKey });

export const generateDailyBets = async (isVip: boolean = false): Promise<Bet[]> => {
  const model = "gemini-3-flash-preview";
  
  const today = new Date().toLocaleDateString('pt-BR');
  const prompt = `INSTRUÇÃO CRÍTICA DE INTEGRIDADE: Você é um analista de dados esportivos em tempo real. 
  Sua tarefa é buscar e validar jogos de futebol que ocorrem EXATAMENTE HOJE, dia ${today}.
  
  REGRAS OBRIGATÓRIAS:
  1. Use a ferramenta Google Search para verificar a grade de jogos de hoje em sites como 365Scores, Flashscore e Oddspedia.
  2. NÃO invente jogos. Se não encontrar jogos que se encaixem nos critérios, retorne uma lista vazia.
  3. Verifique o fuso horário e garanta que o jogo ainda não começou.
  4. Para cada palpite, você deve ser capaz de citar a liga e o horário real do confronto.
  
  CATEGORIAS REQUERIDAS:
  - Aposta Individual: Odd 1.50 a 2.00 (isVip: false).
  - Aposta Múltipla: Combinada de 2 ou 3 jogos com Odd total ~2.00 (isVip: false).
  - Bingo Diário: Uma aposta de alta odd (10+) com análise de risco (isVip: true).
  
  FORMATO DE SAÍDA: Retorne APENAS o JSON estruturado conforme o esquema, sem texto adicional.`;

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
