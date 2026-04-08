import { GoogleGenAI, Type } from "@google/genai";
import { Bet, Match } from "../types";

type KeyType = 'generate' | 'interpret' | 'check' | 'default' | 'single' | 'multi' | 'bingo';

const getAi = (keyType: KeyType = 'default', attempt: number = 0) => {
  // Helper to get env var safely in browser
  const getEnv = (name: string) => {
    return import.meta.env[name] || (window as any).process?.env?.[name] || "";
  };

  const platformKey = (window as any).process?.env?.GEMINI_API_KEY || "";
  
  const keys: Record<string, string[]> = {
    single: [
      getEnv('VITE_XUBETS_GEN_SINGLE_1'),
      getEnv('VITE_XUBETS_GEN_SINGLE_2')
    ].filter(k => !!k),
    multi: [
      getEnv('VITE_XUBETS_GEN_MULTI_1'),
      getEnv('VITE_XUBETS_GEN_MULTI_2')
    ].filter(k => !!k),
    bingo: [
      getEnv('VITE_XUBETS_GEN_BINGO_1'),
      getEnv('VITE_XUBETS_GEN_BINGO_2')
    ].filter(k => !!k),
    interpret: [getEnv('VITE_XUBETS_INTERPRET_KEY')].filter(k => !!k),
    check: [getEnv('VITE_XUBETS_CHECK_KEY')].filter(k => !!k),
    default: [
      getEnv('VITE_XUBETS_AI_KEY'),
      platformKey
    ].filter(k => !!k)
  };

  // Pool all generation keys for 'generate' or 'all'
  const generationPool = [...keys.single, ...keys.multi, ...keys.bingo];
  
  let availableKeys: string[] = [];
  if (keyType === 'generate') {
    availableKeys = generationPool.length > 0 ? generationPool : keys.default;
  } else if (keys[keyType] && keys[keyType].length > 0) {
    availableKeys = keys[keyType];
  } else {
    availableKeys = keys.default;
  }

  // If still no keys, we have a problem
  if (availableKeys.length === 0) {
    console.error(`[AI Service] Nenhuma chave encontrada para ${keyType}. Verifique o menu Secrets.`);
    throw new Error(`Configuração incompleta: Adicione as chaves Gemini no menu Secrets (engrenagem).`);
  }

  // Pick key based on attempt (rotation)
  const apiKey = availableKeys[attempt % availableKeys.length];
  
  const masked = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  console.log(`[AI Service] 🔑 Usando chave para ${keyType} (Tentativa ${attempt + 1}): ${masked}`);
  
  return new GoogleGenAI({ apiKey });
};

export const checkAiKeys = () => {
  const getEnv = (name: string) => import.meta.env[name] || (window as any).process?.env?.[name] || "";
  return {
    single: [getEnv('VITE_XUBETS_GEN_SINGLE_1'), getEnv('VITE_XUBETS_GEN_SINGLE_2')].filter(k => !!k).length,
    multi: [getEnv('VITE_XUBETS_GEN_MULTI_1'), getEnv('VITE_XUBETS_GEN_MULTI_2')].filter(k => !!k).length,
    bingo: [getEnv('VITE_XUBETS_GEN_BINGO_1'), getEnv('VITE_XUBETS_GEN_BINGO_2')].filter(k => !!k).length,
    default: !!((window as any).process?.env?.GEMINI_API_KEY || getEnv('VITE_XUBETS_AI_KEY'))
  };
};

export const generateDailyBets = async (type: 'single' | 'multi' | 'bingo' | 'all' = 'all', attempt: number = 0): Promise<Bet[]> => {
  const ai = getAi(type === 'all' ? 'generate' : type, attempt);
  const model = "gemini-3.1-flash-lite-preview";
  
  // Get current time in Brasilia
  const now = new Date();
  const brFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    hour12: false
  });
  
  const parts = brFormatter.formatToParts(now);
  const brHour = parseInt(parts.find(p => p.type === 'hour')?.value || "0");
  const brDay = parts.find(p => p.type === 'day')?.value;
  const brMonth = parts.find(p => p.type === 'month')?.value;
  const brYear = parts.find(p => p.type === 'year')?.value;
  
  const dateToday = `${brDay}/${brMonth}/${brYear}`;
  
  // Calculate tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowParts = brFormatter.formatToParts(tomorrow);
  const tmDay = tomorrowParts.find(p => p.type === 'day')?.value;
  const tmMonth = tomorrowParts.find(p => p.type === 'month')?.value;
  const tmYear = tomorrowParts.find(p => p.type === 'year')?.value;
  const dateTomorrow = `${tmDay}/${tmMonth}/${tmYear}`;

  let typeInstruction = "";
  if (type === 'single') {
    typeInstruction = `VOCÊ DEVE GERAR EXATAMENTE ESTAS APOSTAS (Total de 2 apostas):
    - 1 aposta "single" FREE (isVip: false, Odd 1.50-2.00)
    - 1 aposta "single" VIP (isVip: true, Odd 1.50-2.00)`;
  } else if (type === 'multi') {
    typeInstruction = `VOCÊ DEVE GERAR EXATAMENTE ESTAS APOSTAS (Total de 2 apostas):
    - 1 aposta "multi" FREE (isVip: false, 2-3 jogos, Odd ~2.00)
    - 1 aposta "multi" VIP (isVip: true, 2-3 jogos, Odd ~2.00)`;
  } else if (type === 'bingo') {
    typeInstruction = `VOCÊ DEVE GERAR EXATAMENTE ESTAS APOSTAS (Total de 3 apostas):
    - 1 aposta "bingo" FREE (isVip: false, Odd 10.00+)
    - 1 aposta "bingo" VIP (isVip: true, Odd 10.00+, mínimo 4 jogos)
    - 1 aposta "bingo" VIP (isVip: true, Odd 50.00+, mínimo 4 jogos)`;
  } else {
    typeInstruction = `VOCÊ DEVE GERAR EXATAMENTE ESTA GRADE DE APOSTAS (Total de 7 apostas):
    - 1 aposta "single" FREE (isVip: false, Odd 1.50-2.00)
    - 1 aposta "multi" FREE (isVip: false, 2-3 jogos, Odd ~2.00)
    - 1 aposta "bingo" FREE (isVip: false, Odd 10.00+)
    - 1 aposta "single" VIP (isVip: true, Odd 1.50-2.00)
    - 1 aposta "multi" VIP (isVip: true, 2-3 jogos, Odd ~2.00)
    - 1 aposta "bingo" VIP (isVip: true, Odd 10.00+, mínimo 4 jogos)
    - 1 aposta "bingo" VIP (isVip: true, Odd 50.00+, mínimo 4 jogos)`;
  }

  const prompt = `VOCÊ É UM ANALISTA PROFISSIONAL DE APOSTAS ESPORTIVAS (BETTING EXPERT).
  HORÁRIO ATUAL EM BRASÍLIA: ${brHour}:00 de ${dateToday}.
  
  SUA MISSÃO:
  1. Use o Google Search para encontrar jogos REAIS de futebol que acontecem entre AGORA e o final do dia ${dateTomorrow}.
  2. PRIORIDADE: Se ainda houver jogos importantes hoje (${dateToday}) que NÃO começaram, inclua-os.
  3. Se já for tarde (após as 21:00 em Brasília), foque mais nos jogos de amanhã (${dateTomorrow}).
  4. VALIDE as odds em sites como Bet365, Betano ou Oddspedia. NÃO invente odds.
  5. NÃO gere jogos que já começaram ou terminaram.
  6. SE NÃO ENCONTRAR JOGOS REAIS COM ODDS CONFIRMADAS, RETORNE UM ARRAY VAZIO []. NUNCA INVENTE JOGOS OU DATAS.
  
  MERCADOS PERMITIDOS (EXPLORE VARIADADE):
  - Resultado Final (1X2)
  - Ambas Marcam (Sim/Não)
  - Gols Asiáticos (Ex: Over 2.25, Under 3.0, Over 2.5)
  - Handicap Asiático (Ex: -0.5, +1.0, -1.25)
  - Escanteios Asiáticos (Ex: Over 9.5 Cantos, Under 10.0 Cantos)
  
  REGRAS DE INTEGRIDADE:
  - RIGOR DE DATA: Verifique se o jogo é REALMENTE entre ${dateToday} e ${dateTomorrow}.
  - CADA TIME SÓ PODE APARECER EM UM ÚNICO JOGO NO DIA.
  - NÃO REPITA BILHETES. Cada aposta deve ter uma combinação ÚNICA de jogos e mercados. 
  - EVITE HALLUCINAÇÕES: Se você não tem certeza de um jogo ou da data, NÃO o inclua.
  - SE O GOOGLE SEARCH NÃO RETORNAR RESULTADOS, RETORNE [].
  
  ${typeInstruction}
  
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
      const isQuota = error?.message?.includes('429') || error?.message?.includes('quota');
      
      // If quota hit and we haven't tried all keys, retry with next key
      if (isQuota && attempt < 5) {
        console.warn(`[AI Service] Key ${attempt + 1} hit quota. Rotating to next key...`);
        return generateDailyBets(type, attempt + 1);
      }

      if (isQuota && useTools) {
        console.warn("[AI Service] All keys hit quota for Search. Retrying without tools for fallback data...");
        // Final attempt without tools
        return await ai.models.generateContent({
          model,
          contents: prompt + "\n\nAVISO: A busca em tempo real falhou. Use seu conhecimento interno para sugerir jogos realistas de grandes ligas que costumam acontecer nesta época.",
          config: { ...config, tools: [] }
        });
      }
      throw error;
    }
  };

  try {
    let response;
    // Try with tools
    response = await generateWithConfig(true);

    let text = response.text || "[]";
    // Clean markdown code blocks if present
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const bets: Bet[] = JSON.parse(text).map((b: any) => ({
      ...b,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      result: 'pending'
    }));

    return bets;
  } catch (error) {
    console.error("Error generating bets:", error);
    throw error;
  }
};

export const generateMockBets = async (type: 'single' | 'multi' | 'bingo' | 'all' = 'all'): Promise<Bet[]> => {
  const teams = ["Real Madrid", "Man City", "Bayern", "PSG", "Liverpool", "Arsenal", "Barcelona", "Inter", "Milan", "Dortmund", "Flamengo", "Palmeiras", "River Plate", "Boca Juniors"];
  const leagues = ["Champions League", "Premier League", "La Liga", "Serie A", "Bundesliga", "Libertadores"];
  const predictions = ["Vitoria Casa", "Ambas Marcam", "Over 2.5 Gols", "Handicap -1.0", "Vitoria Fora"];
  
  const createMatch = (): Match => {
    const t1 = teams[Math.floor(Math.random() * teams.length)];
    let t2 = teams[Math.floor(Math.random() * teams.length)];
    while (t1 === t2) t2 = teams[Math.floor(Math.random() * teams.length)];
    
    return {
      homeTeam: t1,
      awayTeam: t2,
      league: leagues[Math.floor(Math.random() * leagues.length)],
      prediction: predictions[Math.floor(Math.random() * predictions.length)],
      odds: parseFloat((1.4 + Math.random() * 1.5).toFixed(2)),
      time: "20:00"
    };
  };

  const createBet = (betType: 'single' | 'multi' | 'bingo', isVip: boolean): Bet => {
    const matchCount = betType === 'single' ? 1 : betType === 'multi' ? 3 : 6;
    const matches = Array.from({ length: matchCount }, createMatch);
    const totalOdds = matches.reduce((acc, m) => acc * m.odds, 1);
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      type: betType,
      title: `${betType.toUpperCase()} Simulado ${isVip ? 'VIP' : 'FREE'}`,
      description: "Palpite gerado pelo sistema de contingência.",
      odds: parseFloat(totalOdds.toFixed(2)),
      analysis: "Esta é uma aposta simulada gerada automaticamente pelo sistema de contingência para demonstração.",
      isVip,
      matches,
      date: new Date().toISOString(),
      result: 'pending'
    };
  };

  const result: Bet[] = [];
  const typesToGen = type === 'all' ? ['single', 'multi', 'bingo'] : [type];
  
  for (const t of typesToGen) {
    result.push(createBet(t as any, false));
    result.push(createBet(t as any, true));
  }
  
  return result;
};

export const checkBetResults = async (bets: Bet[]): Promise<{ id: string, result: 'win' | 'loss' }[]> => {
  const ai = getAi('check');
  const model = "gemini-3.1-flash-lite-preview";

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
    let text = response.text || "[]";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      console.error("Cota do Gemini atingida para verificação de resultados. Tente novamente em 1 minuto.");
    } else {
      console.error("Error checking results via AI:", error);
    }
    return [];
  }
};

export const interpretBetScreenshot = async (base64Image: string): Promise<Partial<Bet> | null> => {
  const ai = getAi('interpret');
  const model = "gemini-3.1-flash-lite-preview";

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
    let text = response.text || "null";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Error interpreting screenshot:", error);
    return null;
  }
};
