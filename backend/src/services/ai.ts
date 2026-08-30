const QWEN_API_KEY = process.env.QWEN_API_KEY ?? "";
const AI_PROVIDER = process.env.AI_PROVIDER ?? "ollama";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";
const QWEN_BASE_URL = process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = process.env.QWEN_MODEL ?? "qwen-plus-latest";
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 20000);

const bannedKeywords = ["政治敏感", "暴力鼓动", "不良引导"];
type AppLanguage = "zh" | "en" | "ja" | "fr" | "es";
const languageName = (language: AppLanguage = "zh") => ({ zh: "Chinese", en: "English", ja: "Japanese", fr: "French", es: "Spanish" })[language];

interface ExplainInput {
  question: string;
  answer: string;
  isCorrect: boolean;
  knowledgePoint: string;
  audience?: "child" | "general";
  language?: "zh" | "en" | "ja" | "fr" | "es";
}

const fallbackExplain = (input: ExplainInput): string => {
  const localized: string[] | undefined = ({
    en: ["Start by finding the most important pieces and threats.", `Key idea: remember the ${input.knowledgePoint} pattern.`, "Do not stop after one move; check your opponent's reply.", "Try three more puzzles with the same idea.", `Your answer was ${input.isCorrect ? "correct" : "not the expected solution"}. Reference answer: ${input.answer}`],
    ja: ["まず重要な駒と脅威を探しましょう。", `ポイント：${input.knowledgePoint}の形を覚えましょう。`, "1手だけで止まらず、相手の応手も確認しましょう。", "同じテーマの問題をあと3問解いてみましょう。", `あなたの答えは${input.isCorrect ? "正解" : "標準解ではありません"}。正解：${input.answer}`],
    fr: ["Commencez par repérer les pièces et les menaces importantes.", `Idée clé : retenez le motif « ${input.knowledgePoint} ».`, "Ne vous arrêtez pas au premier coup : vérifiez la réponse adverse.", "Essayez encore trois exercices sur le même thème.", `Votre réponse est ${input.isCorrect ? "correcte" : "différente de la solution attendue"}. Réponse : ${input.answer}`],
    es: ["Empieza por identificar las piezas y amenazas más importantes.", `Idea clave: recuerda el patrón « ${input.knowledgePoint} ».`, "No te detengas tras una jugada; comprueba la respuesta rival.", "Prueba tres ejercicios más del mismo tema.", `Tu respuesta fue ${input.isCorrect ? "correcta" : "distinta de la solución esperada"}. Respuesta: ${input.answer}`]
  } as Record<string, string[]>)[input.language || "zh"];
  if (localized) return localized.join("\n");
  const childStyle = input.audience === "child";
  return [
    childStyle ? `第一步：先找最重要的棋子和威胁。` : `思路分步：先识别题型与关键子力关系，再计算1-2步强制变化。`,
    childStyle ? `关键点：记住【${input.knowledgePoint}】这个小本领。` : `关键点：本题核心知识点是【${input.knowledgePoint}】。`,
    childStyle ? `小心：不要只看一步，也要看看对方会不会反击。` : `常见误区：只看一步将军、不检查对方反击。`,
    childStyle ? `下一题：再做3道同样的小练习。` : `类似题建议：做3道同知识点题并复盘错因。`,
    `本题结果：你的答案${input.isCorrect ? "正确" : "暂未命中标准解"}。标准参考：${input.answer}`
  ].join("\n");
};

const safeText = (text: string): boolean => {
  return !bannedKeywords.some((item) => text.includes(item));
};

// Models occasionally ignore a language instruction. Do not expose that response
// in a non-Chinese UI: use the localized fallback instead.
const matchesRequestedLanguage = (text: string, language: AppLanguage = "zh"): boolean => {
  if (language === "zh") return true;
  if (language === "ja") return /[\u3040-\u30ff]/.test(text);
  return !/[\u3400-\u9fff]/.test(text);
};

const callQwen = async (systemPrompt: string, userPrompt: string): Promise<string | null> => {
  if (!QWEN_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${QWEN_API_KEY}`
      },
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify({
        model: QWEN_MODEL,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text || !safeText(text)) {
      return null;
    }
    return text;
  } catch {
    return null;
  }
};

const callOllama = async (prompt: string): Promise<string | null> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        think: false,
        options: {
          temperature: 0.35,
          num_predict: 360
        }
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { response?: string };
    const text = data.response?.trim() ?? "";
    if (!text || !safeText(text)) {
      return null;
    }
    return text;
  } catch {
    return null;
  }
};

export const generateExplanation = async (
  input: ExplainInput
): Promise<{ text: string; source: "qwen" | "ollama" | "fallback" }> => {
  const childStyle = input.audience === "child";
  const languageName = { zh: "Chinese", en: "English", ja: "Japanese", fr: "French", es: "Spanish" }[input.language || "zh"];
  const prompt = [
    `You are a ${childStyle ? "friendly children's" : "clear and encouraging"} chess coach.`,
    `Write the entire response in ${languageName}. Do not use Chinese unless the selected language is Chinese.`,
    "Use four short sections: approach, key idea, common mistake, and next practice.",
    `Puzzle: ${input.question}`,
    `Theme: ${input.knowledgePoint}`,
    `The learner's answer is ${input.isCorrect ? "correct" : "not the expected solution"}.`,
    `Reference answer: ${input.answer}`
  ].join("\n");

  if (AI_PROVIDER === "qwen") {
    const text = await callQwen(
      `You are a chess coach. Reply entirely in ${languageName}.`,
      prompt
    );
    if (text && matchesRequestedLanguage(text, input.language)) {
      return { text, source: "qwen" };
    }
    return { text: fallbackExplain(input), source: "fallback" };
  }

  const text = await callOllama(prompt);
  if (text && matchesRequestedLanguage(text, input.language)) {
    return { text, source: "ollama" };
  }
  return { text: fallbackExplain(input), source: "fallback" };
};

export const generatePgnAnalysis = async (input: {
  pgn: string;
  localSummary: string;
  keyMoves: Array<{ ply: number; san: string; tag: string }>;
  audience?: "child" | "general";
  language?: AppLanguage;
}): Promise<{ summary: string; source: "qwen" | "ollama" | "fallback" }> => {
  const childStyle = input.audience === "child";
  const fallback = ({
    zh: `${input.localSummary}（AI离线兜底）`,
    en: "AI review is temporarily unavailable. Review the moves and look for checks, captures, and threats.",
    ja: "AIによる振り返りは現在利用できません。手順を見直し、チェック、駒取り、脅威を探しましょう。",
    fr: "L'analyse IA est temporairement indisponible. Revoyez les coups et cherchez les échecs, prises et menaces.",
    es: "El análisis de IA no está disponible temporalmente. Revisa las jugadas y busca jaques, capturas y amenazas."
  })[input.language || "zh"];

  const keyLines = input.keyMoves
    .slice(0, 6)
    .map((item) => `第${item.ply}手 ${item.san}（${item.tag}）`)
    .join("\n");

  const userPrompt = [
    `Reply entirely in ${languageName(input.language)}.`,
    "请输出三段中文内容：",
    "1) 对局总评（不超过80字）",
    "2) 两个关键问题",
    "3) 下次训练建议（2条）",
    childStyle ? "请用小朋友听得懂的话，不要太像专业教科书。" : "",
    "不要输出Markdown和编号，直接分段。",
    "",
    `PGN:\n${input.pgn}`,
    "",
    `关键着法摘要:\n${keyLines || "暂无明显关键着法"}`,
    "",
    `本地分析摘要:\n${input.localSummary}`
  ].join("\n");

  if (AI_PROVIDER === "qwen") {
    const aiText = await callQwen(
      childStyle
        ? "你是儿童国际象棋教练，复盘语言要像和小朋友说话。"
        : "你是青少年国际象棋教练，复盘语言具体、鼓励、可执行。",
      userPrompt
    );
    if (aiText && matchesRequestedLanguage(aiText, input.language)) {
      return { summary: aiText, source: "qwen" };
    }
    return { summary: fallback, source: "fallback" };
  }

  const ollamaText = await callOllama(
    [
      childStyle ? "你是儿童国际象棋教练，复盘语言要像和小朋友说话。" : "你是青少年国际象棋教练，复盘语言具体、鼓励、可执行。",
      "请根据下面内容输出简洁中文复盘。",
      userPrompt
    ].join("\n")
  );
  if (ollamaText && matchesRequestedLanguage(ollamaText, input.language)) {
    return { summary: ollamaText, source: "ollama" };
  }

  return { summary: fallback, source: "fallback" };
};

// ── Weekly Report Commentary ───────────────────────────────────

export const generateWeeklyCommentary = async (input: {
  studentName: string;
  weekRange: string;
  solveCount: number;
  battleCount: number;
  pvpWins: number;
  pvpLosses: number;
  pvpDraws: number;
  pointsGained: number;
  currentPoints: number;
  currentRank: string;
  language?: AppLanguage;
}): Promise<{ text: string; source: string }> => {
  const stats = [
    `学生：${input.studentName}`,
    `周期：${input.weekRange}`,
    `正确解题：${input.solveCount}道`,
    `对战局数：${input.battleCount}局（${input.pvpWins}胜${input.pvpLosses}负${input.pvpDraws}平）`,
    `本周积分变化：${input.pointsGained >= 0 ? "+" : ""}${input.pointsGained}分`,
    `当前积分：${input.currentPoints}分，段位：${input.currentRank}`,
  ].join("\n");

  const prompt = [
    `Reply entirely in ${languageName(input.language)}.`,
    "你是一位温暖、专业的国际象棋学习顾问，正在为家长写一份简短的学生周报评语。",
    "请根据下面的学习数据，用中文写一段80-150字的评语，包含：",
    "1) 对学生本周表现的整体评价（鼓励为主）",
    "2) 1-2个亮点或进步",
    "3) 1-2条具体的改进建议",
    "语气要温暖、鼓励、具体，像老师在和家长聊天，不要用序号或格式标记。",
    "",
    stats,
  ].join("\n");

  // Try Ollama first, then Qwen, then fallback
  if (AI_PROVIDER === "ollama" || !AI_PROVIDER) {
    try {
      const ollamaText = await callOllama(prompt);
      if (ollamaText && safeText(ollamaText) && matchesRequestedLanguage(ollamaText, input.language)) {
        return { text: ollamaText, source: "ollama" };
      }
    } catch {}
  }

  if (AI_PROVIDER === "qwen") {
    try {
      const qwenText = await callQwen("你是温暖专业的学习顾问。", prompt);
      if (qwenText && safeText(qwenText) && matchesRequestedLanguage(qwenText, input.language)) {
        return { text: qwenText, source: "qwen" };
      }
    } catch {}
  }

  // Fallback
  const fallback = ({
    zh: input.solveCount > 0 ? `${input.studentName}本周完成了${input.solveCount}道题目和${input.battleCount}局对战，表现不错！继续保持训练节奏，多关注对局中的失误，会进步更快。` : `${input.studentName}本周还没有开始训练哦。建议每天至少完成2道题目和1局对战，坚持就是胜利！家长可以和孩子一起制定一个固定的训练时间。`,
    en: input.solveCount > 0 ? `${input.studentName} completed ${input.solveCount} puzzles and ${input.battleCount} games this week. Keep a steady practice rhythm and review key mistakes after each game.` : `${input.studentName} has not started training this week. Try two puzzles and one game each day to build a regular routine.`,
    ja: input.solveCount > 0 ? `${input.studentName}さんは今週、${input.solveCount}問の問題と${input.battleCount}局の対局を完了しました。練習のリズムを保ち、各対局後に重要なミスを振り返りましょう。` : `${input.studentName}さんは今週まだトレーニングを始めていません。毎日2問と1局から、規則的な練習を始めましょう。`,
    fr: input.solveCount > 0 ? `${input.studentName} a terminé ${input.solveCount} exercices et ${input.battleCount} parties cette semaine. Gardez un rythme régulier et analysez les erreurs importantes après chaque partie.` : `${input.studentName} n'a pas encore commencé à s'entraîner cette semaine. Essayez deux exercices et une partie par jour.`,
    es: input.solveCount > 0 ? `${input.studentName} completó ${input.solveCount} ejercicios y ${input.battleCount} partidas esta semana. Mantén un ritmo regular y revisa los errores clave tras cada partida.` : `${input.studentName} aún no ha empezado a entrenar esta semana. Intenta resolver dos ejercicios y jugar una partida cada día.`
  })[input.language || "zh"];

  return { text: fallback, source: "fallback" };
};
