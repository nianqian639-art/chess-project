const QWEN_API_KEY = process.env.QWEN_API_KEY ?? "";
const AI_PROVIDER = process.env.AI_PROVIDER ?? "ollama";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";
const QWEN_BASE_URL = process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = process.env.QWEN_MODEL ?? "qwen-plus-latest";
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 20000);

const bannedKeywords = ["政治敏感", "暴力鼓动", "不良引导"];

interface ExplainInput {
  question: string;
  answer: string;
  isCorrect: boolean;
  knowledgePoint: string;
  audience?: "child" | "general";
}

const fallbackExplain = (input: ExplainInput): string => {
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
  const prompt = [
    childStyle ? "你是儿童国际象棋教练。" : "你是少儿国际象棋教练，请用中文输出。",
    "输出格式必须是4段：思路分步、关键点、常见误区、类似题建议。",
    childStyle ? "请把每句话都写得像在对小朋友说话，短句、温和、好懂。" : "语言积极、简洁，不输出任何与棋题无关内容。",
    `题目：${input.question}`,
    `知识点：${input.knowledgePoint}`,
    `学生答案是否正确：${input.isCorrect ? "是" : "否"}`,
    `标准参考答案：${input.answer}`
  ].join("\n");

  if (AI_PROVIDER === "qwen") {
    const text = await callQwen(
      childStyle
        ? "你是儿童国际象棋教练，回答要像对小朋友说话。"
        : "你是少儿国际象棋教练，回答要安全、简洁、聚焦棋题本身。",
      prompt
    );
    if (text) {
      return { text, source: "qwen" };
    }
    return { text: fallbackExplain(input), source: "fallback" };
  }

  const text = await callOllama(prompt);
  if (text) {
    return { text, source: "ollama" };
  }
  return { text: fallbackExplain(input), source: "fallback" };
};

export const generatePgnAnalysis = async (input: {
  pgn: string;
  localSummary: string;
  keyMoves: Array<{ ply: number; san: string; tag: string }>;
  audience?: "child" | "general";
}): Promise<{ summary: string; source: "qwen" | "ollama" | "fallback" }> => {
  const childStyle = input.audience === "child";
  const fallback = `${input.localSummary}（AI离线兜底）`;

  const keyLines = input.keyMoves
    .slice(0, 6)
    .map((item) => `第${item.ply}手 ${item.san}（${item.tag}）`)
    .join("\n");

  const userPrompt = [
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
    if (aiText) {
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
  if (ollamaText) {
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
      if (ollamaText && safeText(ollamaText)) {
        return { text: ollamaText, source: "ollama" };
      }
    } catch {}
  }

  if (AI_PROVIDER === "qwen") {
    try {
      const qwenText = await callQwen("你是温暖专业的学习顾问。", prompt);
      if (qwenText && safeText(qwenText)) {
        return { text: qwenText, source: "qwen" };
      }
    } catch {}
  }

  // Fallback
  const fallback = input.solveCount > 0
    ? `${input.studentName}本周完成了${input.solveCount}道题目和${input.battleCount}局对战，表现不错！继续保持训练节奏，多关注对局中的失误，会进步更快。`
    : `${input.studentName}本周还没有开始训练哦。建议每天至少完成2道题目和1局对战，坚持就是胜利！家长可以和孩子一起制定一个固定的训练时间。`;

  return { text: fallback, source: "fallback" };
};
