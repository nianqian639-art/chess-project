import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureArtifactToolWorkspace,
  importArtifactTool,
} from "/Users/daweijunwang/.codex/plugins/cache/openai-primary-runtime/presentations/26.614.11602/skills/presentations/scripts/artifact_tool_utils.mjs";

const WORKSPACE = "/tmp/chesstong-ppt-artifact-workspace";
const PREVIEW_DIR = "/tmp/chesstong-ppt-work/preview";
const QA_DIR = "/tmp/chesstong-ppt-work/qa";
const FINAL_PPTX = path.resolve("docs/chesstong-llm-portfolio.pptx");

const { Presentation, PresentationFile } = await (async () => {
  await ensureArtifactToolWorkspace(WORKSPACE);
  return importArtifactTool(WORKSPACE);
})();

async function writeBlob(filePath, blob) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(await blob.arrayBuffer()));
}

const W = 1280;
const H = 720;
const C = {
  green: "#173B2F",
  green2: "#215542",
  paper: "#F7E8C8",
  paper2: "#FFF6E2",
  gold: "#C89B3C",
  red: "#7A1E24",
  ink: "#253238",
  muted: "#6B6B61",
  white: "#FFFFFF",
};

const deck = Presentation.create({ slideSize: { width: W, height: H } });

function addText(slide, text, x, y, w, h, opts = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    name: opts.name || "text",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = text;
  box.text.style = {
    fontSize: opts.size ?? 24,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    lineSpacing: opts.lineSpacing ?? (opts.heading ? 1.18 : 1.28),
    wrap: "square",
    autoFit: "shrinkText",
    insets: opts.insets ?? { top: 2, right: 2, bottom: 2, left: 2 },
    typeface: opts.typeface ?? "Microsoft YaHei",
  };
  return box;
}

function addShape(slide, geometry, x, y, w, h, opts = {}) {
  return slide.shapes.add({
    geometry,
    name: opts.name || geometry,
    position: { left: x, top: y, width: w, height: h },
    fill: opts.fill ?? C.paper2,
    line: opts.line ?? { style: "solid", fill: opts.lineFill ?? "none", width: opts.lineWidth ?? 0 },
    borderRadius: opts.borderRadius,
    shadow: opts.shadow,
  });
}

function addTitle(slide, eyebrow, title, subtitle) {
  addText(slide, eyebrow, 72, 52, 430, 26, { size: 13, bold: true, color: C.gold });
  addText(slide, title, 72, 86, 900, 112, { size: 34, bold: true, color: C.green, heading: true, lineSpacing: 1.24 });
  if (subtitle) addText(slide, subtitle, 72, 194, 920, 76, { size: 18, color: C.muted, lineSpacing: 1.35 });
}

function addFooter(slide, n) {
  addShape(slide, "rect", 0, 690, W, 30, { fill: C.green, line: { style: "solid", fill: "none", width: 0 } });
  addText(slide, "棋伴国际象棋智能学习平台", 72, 695, 360, 20, { size: 11, color: C.paper });
  addText(slide, String(n).padStart(2, "0"), 1150, 695, 60, 20, { size: 11, color: C.paper, align: "right" });
}

function bullet(slide, text, x, y, w, opts = {}) {
  addShape(slide, "ellipse", x, y + 8, 10, 10, { fill: opts.color || C.gold });
  return addText(slide, text, x + 22, y, w - 22, opts.h || 44, { size: opts.size || 20, color: opts.textColor || C.ink });
}

function card(slide, x, y, w, h, title, body, opts = {}) {
  addShape(slide, "roundRect", x, y, w, h, {
    fill: opts.fill || C.paper2,
    line: { style: "solid", fill: opts.line || "#E5D3A9", width: 1 },
    borderRadius: "rounded-xl",
    shadow: "shadow-sm",
  });
  addText(slide, title, x + 22, y + 18, w - 44, 38, { size: 19, bold: true, color: opts.titleColor || C.green, lineSpacing: 1.25 });
  addText(slide, body, x + 22, y + 62, w - 44, h - 76, { size: 15, color: opts.bodyColor || C.ink, lineSpacing: 1.35 });
}

function chessMini(slide, x, y, size = 252) {
  const cell = size / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      addShape(slide, "rect", x + c * cell, y + r * cell, cell, cell, {
        fill: (r + c) % 2 === 0 ? "#F0D79A" : "#7A4B2D",
        line: { style: "solid", fill: "none", width: 0 },
      });
    }
  }
  addText(slide, "♞", x + cell * 1.12, y + cell * 5.0, cell * 1.2, cell * 1.2, { size: 38, color: C.ink, align: "center" });
  addText(slide, "♔", x + cell * 4.1, y + cell * 7.0, cell * 1.2, cell * 1.2, { size: 38, color: C.white, align: "center" });
  addText(slide, "♛", x + cell * 5.1, y + cell * 2.0, cell * 1.2, cell * 1.2, { size: 38, color: C.ink, align: "center" });
}

function slide1() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  addShape(slide, "rect", 0, 0, 470, H, { fill: C.green });
  chessMini(slide, 110, 268, 250);
  addText(slide, "棋伴", 72, 72, 340, 44, { size: 18, bold: true, color: C.gold });
  addText(slide, "让国际象棋", 530, 104, 620, 62, { size: 48, bold: true, color: C.green, heading: true });
  addText(slide, "更容易听懂，", 530, 176, 620, 62, { size: 48, bold: true, color: C.green, heading: true });
  addText(slide, "也更容易坚持。", 530, 248, 620, 62, { size: 48, bold: true, color: C.green, heading: true });
  addText(slide, "国际象棋智能学习平台项目计划书", 535, 346, 540, 42, { size: 22, color: C.ink });
  addText(slide, "我6岁开始学棋，很清楚初学者最难的不是兴趣，而是理解和坚持。", 535, 408, 610, 96, { size: 20, color: C.muted });
  addShape(slide, "roundRect", 535, 525, 570, 60, { fill: C.green, borderRadius: "rounded-xl" });
  addText(slide, "社会效益优先：从渝中到重庆，帮助更多初学者", 560, 542, 520, 28, { size: 18, bold: true, color: C.paper });
  addFooter(slide, 1);
}

function slide2() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper2;
  addTitle(slide, "WHY", "为什么我想做这个项目", "真实的学习经历，比任何市场分析都更早提醒我：初学者需要有人把棋讲明白。");
  card(slide, 78, 286, 330, 230, "我的起点", "我6岁开始学棋，发现很多孩子不是不想学，而是被术语和缺少反馈卡住了。");
  card(slide, 475, 286, 330, 230, "家长的重要性", "低龄孩子需要鼓励和监督。但很多家长不懂棋，很难看懂学习效果。");
  card(slide, 872, 286, 330, 230, "项目初心", "把“听不懂”变成“能理解”，把“没人监督”变成“进步能被看见”。");
  addFooter(slide, 2);
}

function slide3() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "PAIN POINTS", "初学者真正卡在哪里", "尤其是 4-10 岁、三级之前的孩子，他们最需要的是清楚解释和持续陪伴。");
  const items = [
    ["专业语言难懂", "牵制、闪击、弱格等词会背，不代表孩子真的理解。"],
    ["做题只有对错", "很多题库告诉学生答案，却没有解释为什么。"],
    ["家长难监督", "家长愿意支持，但不懂棋，很难判断孩子是否进步。"],
    ["课后管理困难", "老师课堂讲完后，很难持续追踪每个学生练习。"],
  ];
  items.forEach(([t, b], i) => {
    const x = 92 + (i % 2) * 560;
    const y = 246 + Math.floor(i / 2) * 170;
    card(slide, x, y + 18, 488, 126, t, b, { fill: i % 2 ? "#FFFFFF" : C.paper2 });
  });
  addFooter(slide, 3);
}

function slide4() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper2;
  addTitle(slide, "SOLUTION", "棋伴的学习闭环", "把学棋从课堂延伸到每天。");
  const cx = 640, cy = 385;
  const nodes = [
    ["孩子", 640, 190, "做题 / 对战 / 学习"],
    ["AI", 940, 385, "讲清楚每一步"],
    ["家长", 640, 580, "看见坚持和进步"],
    ["老师", 340, 385, "布置任务和管理"],
  ];
  addShape(slide, "ellipse", cx - 82, cy - 82, 164, 164, { fill: C.green });
  addText(slide, "棋伴", cx - 70, cy - 15, 140, 32, { size: 22, bold: true, color: C.paper, align: "center" });
  nodes.forEach(([title, x, y, sub]) => {
    addShape(slide, "roundRect", x - 115, y - 46, 230, 92, { fill: C.paper, line: { style: "solid", fill: C.gold, width: 2 }, borderRadius: "rounded-xl" });
    addText(slide, title, x - 100, y - 30, 200, 32, { size: 22, bold: true, color: C.green, align: "center" });
    addText(slide, sub, x - 100, y + 8, 200, 34, { size: 14, color: C.muted, align: "center" });
  });
  addFooter(slide, 4);
}

function slide5() {
  const slide = deck.slides.add();
  slide.background.fill = C.green;
  addText(slide, "CORE INNOVATION", 72, 52, 360, 26, { size: 13, bold: true, color: C.gold });
  addText(slide, "用大语言模型，\n把专业棋语讲成孩子听得懂的话", 72, 88, 1020, 130, { size: 34, bold: true, color: C.paper, heading: true, lineSpacing: 1.28 });
  addShape(slide, "roundRect", 86, 265, 500, 250, { fill: C.paper2, borderRadius: "rounded-xl" });
  addText(slide, "传统说法", 118, 292, 180, 28, { size: 20, bold: true, color: C.red });
  addText(slide, "“这是一个牵制。被牵制的子不能随便移动，否则会暴露后方更重要的目标。”", 118, 345, 410, 132, { size: 21, color: C.ink, lineSpacing: 1.35 });
  addShape(slide, "roundRect", 690, 265, 500, 250, { fill: C.paper2, borderRadius: "rounded-xl" });
  addText(slide, "AI 面向初学者解释", 722, 292, 260, 28, { size: 20, bold: true, color: C.green });
  addText(slide, "“这个棋子后面保护着更重要的棋子，所以它现在不能乱走，就像被钉在原地一样。”", 722, 345, 410, 132, { size: 21, color: C.ink, lineSpacing: 1.35 });
  addFooter(slide, 5);
}

function slide6() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "PRODUCT", "平台目前能做什么", "不是单一题库，而是面向初学者、家长和老师的一整套学习工具。");
  const modules = [
    ["学习中心", "开局原则、中局思路、残局基础"],
    ["题库训练", "做题、判定、提示、错题反馈"],
    ["AI 讲解", "把专业内容解释成新手能懂的话"],
    ["人机对战", "Stockfish 练习与建议走法"],
    ["家长中心", "绑定孩子、学习周报、计划监督"],
    ["老师管理", "班级、作业、公告与学生情况"],
  ];
  modules.forEach(([t, b], i) => {
    const x = 78 + (i % 3) * 390;
    const y = 242 + Math.floor(i / 3) * 150;
    card(slide, x, y, 330, 112, t, b, { fill: "#FFFFFF" });
  });
  addFooter(slide, 6);
}

function slide7() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper2;
  addTitle(slide, "PROGRESS", "目前进展", "项目已经不是停留在想法里，而是开始真实服务初学者。");
  addShape(slide, "roundRect", 92, 258, 300, 180, { fill: C.green, borderRadius: "rounded-xl" });
  addText(slide, "已上线", 120, 298, 240, 44, { size: 34, bold: true, color: C.paper, align: "center" });
  addText(slide, "具备注册、学习、训练、AI 讲解、家长/老师管理等功能", 122, 360, 238, 52, { size: 17, color: C.paper, align: "center" });
  addShape(slide, "roundRect", 490, 258, 300, 180, { fill: C.gold, borderRadius: "rounded-xl" });
  addText(slide, "获得认可", 518, 298, 240, 44, { size: 34, bold: true, color: C.green, align: "center" });
  addText(slide, "获得渝中区国际象棋协会的认可", 512, 360, 256, 58, { size: 16, color: C.green, align: "center" });
  addShape(slide, "roundRect", 888, 258, 300, 180, { fill: C.green2, borderRadius: "rounded-xl" });
  addText(slide, "正在使用", 916, 298, 240, 44, { size: 34, bold: true, color: C.paper, align: "center" });
  addText(slide, "帮助当地初学者进行国际象棋学习", 920, 360, 236, 52, { size: 18, color: C.paper, align: "center" });
  addFooter(slide, 7);
}

function slide8() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "IMPACT FIRST", "现阶段最重要的是社会效益", "先让更多孩子用得上、看得懂、坚持得下去。");
  bullet(slide, "帮助孩子降低入门门槛：不被专业术语挡在门外。", 130, 260, 920, { size: 24, color: C.green });
  bullet(slide, "帮助家长更好陪伴：不懂棋，也能看到练习和进步。", 130, 340, 920, { size: 24, color: C.green });
  bullet(slide, "帮助老师提高效率：课后练习变得可追踪、可反馈。", 130, 420, 920, { size: 24, color: C.green });
  bullet(slide, "帮助重庆少儿国际象棋普及：从渝中试点，慢慢服务更多区域。", 130, 500, 920, { size: 24, color: C.green });
  addFooter(slide, 8);
}

function slide9() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper2;
  addTitle(slide, "ROADMAP", "从渝中到重庆", "先把小范围做好，再稳步推广，而不是一开始就追求规模。");
  const steps = [
    ["01", "渝中试点", "继续收集孩子、家长、老师的真实反馈"],
    ["02", "优化体验", "改进 AI 讲解、题库难度和学习报告"],
    ["03", "区域推广", "与更多老师、机构和协会合作"],
    ["04", "服务重庆", "覆盖更多 4-10 岁、三级之前学习者"],
  ];
  steps.forEach(([num, title, body], i) => {
    const x = 84 + i * 296;
    addShape(slide, "roundRect", x, 262, 238, 220, { fill: i % 2 ? "#FFFFFF" : C.paper, borderRadius: "rounded-xl" });
    addText(slide, num, x + 20, 288, 70, 42, { size: 32, bold: true, color: C.gold });
    addText(slide, title, x + 20, 344, 198, 34, { size: 24, bold: true, color: C.green });
    addText(slide, body, x + 20, 392, 198, 66, { size: 17, color: C.muted });
  });
  addFooter(slide, 9);
}

function slide10() {
  const slide = deck.slides.add();
  slide.background.fill = C.green;
  addText(slide, "FUTURE VALUE", 72, 52, 360, 26, { size: 13, bold: true, color: C.gold });
  addText(slide, "未来可能的经济效益：\n个人学棋 Agent", 72, 100, 560, 170, { size: 40, bold: true, color: C.paper, heading: true, lineSpacing: 1.28 });
  addText(slide, "现阶段以社会效益为主。等平台服务更多初学者后，可以为更高级学习者提供个性化 AI 教练。", 78, 300, 520, 104, { size: 20, color: C.paper, lineSpacing: 1.35 });
  card(slide, 690, 118, 430, 118, "记录学生情况", "错题、对局、训练时间、目标等级", { fill: C.paper2 });
  card(slide, 690, 270, 430, 118, "生成学习计划", "每天练什么、为什么练、如何复盘", { fill: C.paper2 });
  card(slide, 690, 422, 430, 118, "长期陪伴进步", "像一个随时能解释的 AI 学棋助手", { fill: C.paper2 });
  addFooter(slide, 10);
}

// ── LLM Engineering Slides ──────────────────────────────────────

function slideTechArch() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "TECH STACK", "LLM 工程技术架构", "8 个核心维度贯穿平台设计，确保 AI 服务高可用、安全、可解释。");
  const dims = [
    ["Prompt Engineering", "3 组场景化 System Prompt\n结构化输出 + 动态数据注入", C.green],
    ["RAG 知识检索", "结构化棋艺知识图谱\n学习内容检索 + 题库关联", C.green2],
    ["Tool Calling", "双引擎架构\nStockfish UCI + Qwen API", C.gold],
    ["Memory 体系", "4 层记忆：会话→交互→轨迹→社交\nSQLite WAL 持久化", C.green],
    ["Agent 设计", "3 个独立 Agent\n解题教练 / 复盘师 / 学习顾问", C.green2],
    ["Multi-Agent", "数据库驱动协作\nWebSocket 实时同步", C.gold],
    ["Safety Guard", "4 层纵深防御\n过滤→认证→熔断→Prompt 约束", C.green],
    ["Fallback 策略", "全链路 3-4 级回退\nOllama→Qwen→规则引擎", C.green2],
  ];
  dims.forEach(([t, b, color], i) => {
    const x = 48 + (i % 4) * 304;
    const y = 244 + Math.floor(i / 4) * 225;
    addShape(slide, "roundRect", x, y, 280, 195, { fill: C.paper2, borderRadius: "rounded-xl" });
    addText(slide, t, x + 16, y + 14, 248, 32, { size: 15, bold: true, color });
    addText(slide, b, x + 16, y + 54, 248, 126, { size: 12, color: C.ink, lineSpacing: 1.45 });
  });
  addFooter(slide, 11);
}

function slidePromptRAG() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper2;
  addTitle(slide, "PROMPT & RAG", "Prompt Engineering + 知识检索", "结构化 Prompt 约束输出格式，知识图谱确保学习内容精准匹配。");

  addShape(slide, "roundRect", 78, 252, 540, 200, { fill: C.paper, borderRadius: "rounded-xl" });
  addText(slide, "Prompt Engineering 设计", 100, 274, 496, 30, { size: 20, bold: true, color: C.green });
  addText(slide, "• 角色锚定：少儿教练 / 复盘师 / 学习顾问\n• 4 段结构化输出：思路→关键点→误区→建议\n• 动态注入：题目、知识点、学生答案正确性\n• 去 Markdown 约束：确保纯文本输出", 100, 316, 496, 120, { size: 15, color: C.ink, lineSpacing: 1.4 });

  addShape(slide, "roundRect", 662, 252, 540, 200, { fill: C.paper, borderRadius: "rounded-xl" });
  addText(slide, "结构化知识库 (RAG)", 684, 274, 496, 30, { size: 20, bold: true, color: C.green2 });
  addText(slide, "• 11 课分层知识内容（开局/中局/残局）\n• keyFen 交互棋盘 + tips 学习提示\n• 300+ 题 knowledgePoint 关联知识库\n• 学→练→讲→复 四步学习闭环", 684, 316, 496, 120, { size: 15, color: C.ink, lineSpacing: 1.4 });

  addShape(slide, "roundRect", 78, 490, 1124, 142, { fill: C.green });
  addText(slide, "示例：AI 讲解 Prompt 模板", 100, 508, 300, 24, { size: 14, bold: true, color: C.paper });
  addText(slide, 'System: "你是少儿国际象棋教练，用中文输出。4段格式：思路分步、关键点、常见误区、类似题建议。"\nUser: "题目：白方如何两步内将杀？ | 知识点：两步杀 | 学生答案正确：是 | 标准答案：Qh7#"', 100, 540, 1080, 78, { size: 14, color: C.paper, lineSpacing: 1.35 });
  addFooter(slide, 12);
}

function slideToolAgent() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  addTitle(slide, "TOOL & AGENT", "Tool Calling + Agent 架构", "3 个专业 Agent 通过双引擎协作，AI 负责解释，引擎负责计算。");

  addShape(slide, "roundRect", 78, 245, 520, 190, { fill: C.paper2, borderRadius: "rounded-xl" });
  addText(slide, "Tool Calling：双引擎架构", 100, 268, 476, 30, { size: 19, bold: true, color: C.green });
  addText(slide, "Tier 1 → Stockfish HTTP Service\nTier 2 → 本地 Stockfish UCI 子进程\nTier 3 → chess.js 规则引擎回退\n\n与 AI 协作：引擎算走法，AI 解释原因", 100, 310, 476, 110, { size: 14, color: C.ink, lineSpacing: 1.38 });

  addShape(slide, "roundRect", 660, 245, 520, 190, { fill: C.paper2, borderRadius: "rounded-xl" });
  addText(slide, "3 个独立 Agent", 682, 268, 476, 30, { size: 19, bold: true, color: C.green2 });
  addText(slide, "Agent 1 解题教练 → explain 后 4 段讲解\nAgent 2 复盘师 → 对局分析 + 改进建议\nAgent 3 学习顾问 → 周报评语（温暖鼓励）\n\n各自独立 Prompt + Fallback + 路由", 682, 310, 476, 110, { size: 14, color: C.ink, lineSpacing: 1.38 });

  // Architecture diagram box
  addShape(slide, "roundRect", 78, 465, 1124, 158, { fill: C.green, borderRadius: "rounded-xl" });
  addText(slide, "Agent 调度流程", 100, 480, 200, 24, { size: 14, bold: true, color: C.paper });
  addText(slide, "用户行为 → [提交题目 / 完成对局 / 查看周报] → Agent 路由分发 → [解题教练 / 复盘师 / 学习顾问] → 统一 Fallback 层 → 返回用户", 100, 512, 1080, 90, { size: 15, color: C.paper, lineSpacing: 1.35, align: "center" });
  addFooter(slide, 13);
}

function slideSafetyFallback() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper2;
  addTitle(slide, "SAFETY & FALLBACK", "安全防护 + 优雅降级", "面向 4-10 岁少儿用户，安全是最高优先级；AI 不可用时服务永远不中断。");

  addShape(slide, "roundRect", 78, 248, 540, 390, { fill: C.paper, borderRadius: "rounded-xl" });
  addText(slide, "4 层纵深安全防护", 100, 274, 496, 30, { size: 20, bold: true, color: C.green });
  const safetyItems = [
    ["认证与授权", "JWT Token · 角色权限 · WS auth"],
    ["内容安全过滤", "bannedKeywords 黑名单 · safeText()"],
    ["超时熔断保护", "AI 20s · Engine 3s · Stockfish 3.5s"],
    ["Prompt 安全约束", "角色边界 · 输出格式强制 · 话题限制"],
  ];
  safetyItems.forEach(([t, b], i) => {
    addText(slide, t, 100, 320 + i * 75, 200, 24, { size: 16, bold: true, color: C.gold });
    addText(slide, b, 100, 346 + i * 75, 496, 22, { size: 14, color: C.ink });
  });

  addShape(slide, "roundRect", 662, 248, 540, 390, { fill: C.paper, borderRadius: "rounded-xl" });
  addText(slide, "全链路 Fallback 策略", 684, 274, 496, 30, { size: 20, bold: true, color: C.green2 });
  const fbItems = [
    ["AI 讲解", "Ollama → Qwen API → fallbackExplain()"],
    ["PGN 复盘", "Ollama → Qwen API → 本地摘要兜底"],
    ["周报评语", "Ollama → Qwen API → 条件化文本"],
    ["引擎走法", "HTTP → UCI 子进程 → chess.js 规则"],
    ["关键原则", "永不中断 → 用户无感知降级"],
  ];
  fbItems.forEach(([t, b], i) => {
    addText(slide, t, 684, 320 + i * 75, 200, 24, { size: 16, bold: true, color: C.gold });
    addText(slide, b, 684, 346 + i * 75, 496, 22, { size: 14, color: C.ink });
  });
  addFooter(slide, 14);
}

function slide11() {
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  chessMini(slide, 850, 222, 260);
  addText(slide, "ENDING", 72, 68, 240, 26, { size: 13, bold: true, color: C.gold });
  addText(slide, "我希望棋伴成为", 72, 112, 660, 58, { size: 38, bold: true, color: C.green, heading: true });
  addText(slide, "孩子、家长和老师之间的一座桥。", 72, 176, 720, 58, { size: 38, bold: true, color: C.green, heading: true });
  addText(slide, "让孩子更容易理解国际象棋，让家长更容易支持孩子，让老师更容易看见学生的进步。", 78, 302, 620, 100, { size: 21, color: C.ink, lineSpacing: 1.35 });
  addShape(slide, "roundRect", 78, 445, 560, 70, { fill: C.green, borderRadius: "rounded-xl" });
  addText(slide, "从渝中出发，服务重庆更多初学者。", 104, 466, 508, 30, { size: 24, bold: true, color: C.paper, align: "center" });
  addFooter(slide, 15);
}

[slide1, slide2, slide3, slide4, slide5, slide6, slide7, slide8, slide9, slide10, slideTechArch, slidePromptRAG, slideToolAgent, slideSafetyFallback, slide11].forEach((fn) => fn());

await fs.mkdir(PREVIEW_DIR, { recursive: true });
for (const [index, slide] of deck.slides.items.entries()) {
  const stem = `slide-${String(index + 1).padStart(2, "0")}`;
  await writeBlob(path.join(PREVIEW_DIR, `${stem}.png`), await deck.export({ slide, format: "png", scale: 1 }));
  await fs.writeFile(path.join(PREVIEW_DIR, `${stem}.layout.json`), await (await slide.export({ format: "layout" })).text());
}
await writeBlob(path.join(PREVIEW_DIR, "deck-montage.webp"), await deck.export({ format: "webp", montage: true, scale: 1 }));

const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(FINAL_PPTX);

await fs.mkdir(QA_DIR, { recursive: true });
await fs.writeFile(
  path.join(QA_DIR, "visual-qa.txt"),
  [
    "Visual QA notes",
    "- Rendered all 15 slides to PNG plus montage using artifact-tool. Includes 4 LLM Engineering technical slides.",
    "- Deck uses editable text boxes and shapes, not image-only slides.",
    "- Personal story says age 6 chess learning only; no sixth-grade competition reference.",
    "- Checked slide structure for concise text and no intentionally tiny body text.",
  ].join("\n"),
);

console.log(FINAL_PPTX);
