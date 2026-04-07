import { GoogleGenAI, Type } from "@google/genai";
import { Bet, Match } from "../types";

const getAi = () => {
  // @ts-ignore - process.env is shimmed by the platform for GEMINI_API_KEY
  const apiKey = import.meta.env.VITE_XUBETS_AI_KEY || process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    const isNetlify = window.location.hostname.includes('netlify.app');
    const msg = isNetlify 
      ? "ERRO: Chave API não encontrada no Netlify. Adicione VITE_XUBETS_AI_KEY nas 'Environment Variables' do seu site no painel do Netlify."
      : "ERRO: Chave API não encontrada. Adicione VITE_XUBETS_AI_KEY nos Secrets do AI Studio.";
    console.error(msg);
    throw new Error(msg);
  }
  
  return new GoogleGenAI({ apiKey });
};

export const generateDailyBets = async (isVip: boolean = false): Promise<Bet[]> => {
  const ai = getAi();
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
  1. Use o Google Search para encontrar jogos REAIS de futebol que acontecem EXATAMENTE na data ${dateStr}.
  2. VALIDE as odds em sites como Bet365, Betano ou Oddspedia. NÃO invente odds.
  3. Se o horário atual em Brasília for após as 16:00, foque EXCLUSIVAMENTE nos jogos do dia seguinte (${dateStr}).
  4. NÃO gere jogos que já começaram ou terminaram.
  5. Se não encontrar jogos reais com odds confirmadas para ${dateStr}, retorne um array vazio [].
  
  REGRAS DE INTEGRIDADE:
  - RIGOR DE DATA: Verifique se o jogo é REALMENTE no dia ${dateStr}. Não confunda com jogos de datas próximas.
  - CADA TIME SÓ PODE APARECER EM UM ÚNICO JOGO NO DIA. (Ex: Se o Real Madrid joga contra o Barcelona no dia ${dateStr}, o Real Madrid não pode aparecer em outro jogo no mesmo dia).
  - NÃO REPITA BILHETES. Cada aposta deve ter uma combinação ÚNICA de jogos e mercados. 
  - Se um time já foi usado em uma aposta "single", ele pode aparecer em uma "multi" ou "bingo", mas o mercado (prediction) deve ser consistente ou o jogo deve ser real.
  - EVITE HALLUCINAÇÕES: Se você não tem certeza de um jogo ou da data, NÃO o inclua.
  
  VOCÊ DEVE GERAR EXATAMENTE ESTA GRADE DE APOSTAS (Total de 7 apostas):
  - 1 aposta "single" FREE (isVip: false, Odd 1.50-2.00)
  - 1 aposta "multi" FREE (isVip: false, 2-3 jogos, Odd ~2.00)
  - 1 aposta "bingo" FREE (isVip: false, Odd 10.00+)
  - 1 aposta "single" VIP (isVip: true, Odd 1.50-2.00)
  - 1 aposta "multi" VIP (isVip: true, 2-3 jogos, Odd ~2.00)
  - 1 aposta "bingo" VIP (isVip: true, Odd 10.00+, mínimo 4 jogos)
  - 1 aposta "bingo" VIP (isVip: true, Odd 50.00+, mínimo 4 jogos)
  
  REGRAS PARA BINGOS VIP:
  - Devem conter no mínimo 4 jogos da grade do dia.
  - Um bingo VIP deve ter odd total entre 10.00 e 49.99.
  - O outro bingo VIP deve ter odd total de 50.00 ou mais.
  - Não há limite máximo de jogos para os bingos.
  
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

    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config
      });
    } catch (error: any) {
      // Fallback to base model if tools fail or quota hit
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.warn("Quota exceeded for tools, falling back to base model...");
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt + " (Nota: Use seu conhecimento interno se a busca falhar)",
          config: { ...config, tools: [] }
        });
      }
      throw error;
    }
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

export const checkBetResults = async (bets: Bet[]): Promise<{ id: string, result: 'win' | 'loss' }[]> => {
  const ai = getAi();
  const model = "gemini-3-flash-preview";

  const prompt = `Você é um verificador de resultados esportivos. 
  Para cada aposta abaixo, verifique se os resultados reais dos jogos confirmam o palpite.
  
  APOSTAS:
  ${JSON.stringify(bets.map(b => ({ id: b.id, matches: b.matches })))}
  
  REGRAS:
  1. Use o Google Search para verificar os placares finais.
  2. Retorne APENAS um JSON no formato: [{"id": "...", "result": "win" | "loss"}]
  3. Se o jogo ainda não terminou ou não encontrou o resultado, não inclua no JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error checking results via AI:", error);
    return [];
  }
};

export const interpretBetScreenshot = async (base64Image: string): Promise<Partial<Bet> | null> => {
  const ai = getAi();
  const model = "gemini-3-flash-preview";

  const prompt = `Você é um especialista em extração de dados de apostas esportivas.
  Analise a imagem da aposta (print de casa de aposta) e extraia os detalhes.
  
  REGRAS:
  1. Identifique o tipo de aposta (single, multi ou bingo).
  2. Extraia o título (ex: "Dupla de Valor", "Múltipla Premier League").
  3. Extraia as odds totais.
  4. Extraia cada jogo (homeTeam, awayTeam, league, prediction, odds, time).
  5. Retorne APENAS um JSON no formato:
  {
    "type": "single" | "multi" | "bingo",
    "title": "...",
    "odds": 0.0,
    "matches": [
      { "homeTeam": "...", "awayTeam": "...", "league": "...", "prediction": "...", "odds": 0.0, "time": "HH:MM" }
    ],
    "analysis": "Breve análise baseada nos jogos encontrados"
  }`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image.split(',')[1] || base64Image
          }
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Error interpreting screenshot:", error);
    return null;
  }
};
