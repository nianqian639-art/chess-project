import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authGuard } from "../middleware/auth.js";
import { db, getRank, today } from "../services/db.js";
import { getUserById, nowIso, requireUserId } from "../services/common.js";
import { generateWeeklyCommentary } from "../services/ai.js";

// ── schemas ─────────────────────────────────────────────────────

const bindChildBody = z.object({
  code: z.string().length(6)
});

const studyPlanBody = z.object({
  childId: z.string().min(1),
  dailySolveTarget: z.number().min(0).max(100),
  dailyBattleTarget: z.number().min(0).max(50),
  startDate: z.string().min(10),
  endDate: z.string().min(10)
});

const studyPlanUpdateBody = z.object({
  dailySolveTarget: z.number().min(0).max(100).optional(),
  dailyBattleTarget: z.number().min(0).max(50).optional(),
  startDate: z.string().min(10).optional(),
  endDate: z.string().min(10).optional()
});

// ── helpers ─────────────────────────────────────────────────────

const generateBindingCode = (): string => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const getTodayProgress = (userId: string, date: string) => {
  const solveCount = new Set(
    db.attempts
      .filter((a) => a.userId === userId && a.isCorrect && a.submittedAt.startsWith(date))
      .map((a) => a.problemId)
  ).size;
  const battleCount = db.matches.filter(
    (m) => m.userId === userId && m.createdAt.startsWith(date)
  ).length;
  return { solveCount, battleCount };
};

// ── Weekly Report Generator ─────────────────────────────────────

function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday.toISOString(), end: sunday.toISOString() };
}

async function generateWeeklyReport(
  studentId: string,
  parentId: string
): Promise<{
  solveCount: number; battleCount: number;
  pvpWins: number; pvpLosses: number; pvpDraws: number;
  pointsGained: number; currentPoints: number; currentRank: string;
  totalAttempts: number; totalAccuracy: string;
  homeworkDone: number; homeworkTotal: number;
  dailyBreakdown: { date: string; solve: number; battle: number }[];
  aiCommentary: string; suggestions: string[];
}> {
  const { start, end } = getWeekRange(new Date());
  const student = getUserById(studentId);
  if (!student) throw new Error("学生不存在");

  // Weekly stats
  const solveCount = new Set(
    db.attempts.filter((a) => a.userId === studentId && a.isCorrect && a.submittedAt >= start && a.submittedAt <= end).map((a) => a.problemId)
  ).size;
  const weekMatches = db.matches.filter((m) => m.userId === studentId && m.createdAt >= start && m.createdAt <= end);
  const battleCount = weekMatches.length;
  const pvpWins = weekMatches.filter((m) => m.result === "win").length;
  const pvpLosses = weekMatches.filter((m) => m.result === "lose").length;
  const pvpDraws = weekMatches.filter((m) => m.result === "draw").length;
  const pointsGained = db.pointLedger.filter((e) => e.userId === studentId && e.createdAt >= start && e.createdAt <= end).reduce((sum, e) => sum + e.change, 0);

  // All-time accuracy
  const allAttempts = db.attempts.filter((a) => a.userId === studentId);
  const allCorrect = allAttempts.filter((a) => a.isCorrect).length;
  const totalAttempts = allAttempts.length;
  const totalAccuracy = totalAttempts > 0 ? ((allCorrect / totalAttempts) * 100).toFixed(1) + "%" : "0%";

  // Homework
  const studentClasses = db.classes.filter((c) => c.memberIds.includes(studentId));
  let homeworkDone = 0, homeworkTotal = 0;
  for (const cls of studentClasses) {
    const hws = db.homeworks.filter((h) => h.classId === cls.id);
    homeworkTotal += hws.length;
    for (const hw of hws) {
      if (db.homeworkAttempts.some((a) => a.homeworkId === hw.id && a.userId === studentId && a.isCorrect)) homeworkDone++;
    }
  }

  // Daily breakdown
  const dailyBreakdown: { date: string; solve: number; battle: number }[] = [];
  const weekStart = new Date(start);
  for (let d = 0; d < 7; d++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + d);
    const ds = date.toISOString().slice(0, 10);
    dailyBreakdown.push({
      date: ds,
      solve: new Set(db.attempts.filter((a) => a.userId === studentId && a.isCorrect && a.submittedAt.startsWith(ds)).map((a) => a.problemId)).size,
      battle: db.matches.filter((m) => m.userId === studentId && m.createdAt.startsWith(ds)).length,
    });
  }

  const rank = getRank(student.points);

  // Generate AI commentary
  let aiCommentary = "";
  let suggestions: string[] = [];
  try {
    const result = await generateWeeklyCommentary({
      studentName: student.displayName,
      weekRange: `${start.slice(0, 10)} 至 ${end.slice(0, 10)}`,
      solveCount, battleCount, pvpWins, pvpLosses, pvpDraws,
      pointsGained, currentPoints: student.points,
      currentRank: rank.piece + rank.title,
    });
    aiCommentary = result.text || "";
    suggestions = result.text
      ? result.text.split(/[。！\n]/).filter((s: string) => s.includes("建议") || s.includes("可以") || s.includes("多") || s.includes("尝试")).slice(0, 4)
      : [];
  } catch {
    aiCommentary = `${student.displayName}本周学习态度认真，继续加油！`;
  }

  if (suggestions.length === 0) {
    suggestions = [
      solveCount < 10 ? "建议每天至少完成2道题目，保持规律的训练节奏" : "解题量不错，可以尝试更高难度的题目",
      battleCount < 3 ? "建议每周至少进行3局对战，实战是提高棋力的最佳途径" : "对战表现稳定，可以尝试学习新的开局变化",
      pvpLosses > pvpWins ? "输棋不要气馁，每局结束后回顾关键局面，从失败中学习" : "保持良好的竞技状态，注意复盘分析",
      homeworkDone < homeworkTotal ? `作业完成了${homeworkDone}/${homeworkTotal}，记得按时完成班级作业哦` : "作业全部完成，非常棒！",
    ];
  }

  return {
    solveCount, battleCount, pvpWins, pvpLosses, pvpDraws,
    pointsGained, currentPoints: student.points,
    currentRank: rank.piece + " " + rank.title,
    totalAttempts, totalAccuracy,
    homeworkDone, homeworkTotal,
    dailyBreakdown,
    aiCommentary, suggestions,
  };
}

// ── routes ──────────────────────────────────────────────────────

export const parentRoutes: FastifyPluginAsync = async (app) => {

  // ── Binding Code (6-digit, 5-min expiry) ────────────────────

  // Student: get or create their 6-digit binding code (valid 5 min)
  app.get("/student/my-code", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user || user.role !== "student") {
      return reply.code(403).send({ message: "仅学生可查看绑定码" });
    }
    // Remove expired codes for this student
    db.bindingCodes = db.bindingCodes.filter(
      (b) => !(b.studentId === userId && new Date(b.expiresAt) < new Date())
    );
    // Create new code
    const code = generateBindingCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
    const bc = { code, studentId: userId, expiresAt, createdAt: nowIso() };
    db.bindingCodes.push(bc);
    return {
      code: bc.code,
      expiresAt: bc.expiresAt,
      expiresInSeconds: 300,
      message: "请在5分钟内让家长输入此码完成绑定"
    };
  });

  // Student: regenerate their binding code
  app.post("/student/regenerate-code", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user || user.role !== "student") {
      return reply.code(403).send({ message: "仅学生可重新生成绑定码" });
    }
    db.bindingCodes = db.bindingCodes.filter((b) => b.studentId !== userId);
    const code = generateBindingCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    db.bindingCodes.push({ code, studentId: userId, expiresAt, createdAt: nowIso() });
    return {
      code,
      expiresAt,
      expiresInSeconds: 300,
      message: "新绑定码已生成，5分钟内有效"
    };
  });

  // Parent: bind a child using the 6-digit code
  app.post("/parent/bind-child", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user || user.role !== "parent") {
      return reply.code(403).send({ message: "仅家长可绑定孩子" });
    }
    const body = bindChildBody.parse(request.body);
    if (body.code.length !== 6) {
      return reply.code(400).send({ message: "绑定码为6位数字" });
    }
    const bc = db.bindingCodes.find((b) => b.code === body.code);
    if (!bc) {
      return reply.code(404).send({ message: "绑定码无效，请让学生重新生成" });
    }
    // Check expiry
    if (new Date(bc.expiresAt) < new Date()) {
      db.bindingCodes = db.bindingCodes.filter((b) => b.code !== body.code);
      return reply.code(400).send({ message: "绑定码已过期（5分钟有效），请让学生重新生成" });
    }
    const child = getUserById(bc.studentId);
    if (!child) {
      return reply.code(404).send({ message: "学生不存在" });
    }
    if (user.childIds.includes(child.id)) {
      return reply.code(400).send({ message: "已经绑定过该学生" });
    }
    user.childIds.push(child.id);
    // Clean up used code
    db.bindingCodes = db.bindingCodes.filter((b) => b.code !== body.code);
    return { message: `成功绑定「${child.displayName}」`, childId: child.id, childName: child.displayName };
  });

  // ── My Children ────────────────────────────────────────────

  app.get("/parent/my-children", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user || user.role !== "parent") {
      return reply.code(403).send({ message: "仅家长可查看" });
    }
    const date = today();
    const children = (user.childIds as string[])
      .map((id: string) => db.users.find((u: any) => u.id === id))
      .filter(Boolean)
      .map((child: any) => {
        const attempts = db.attempts.filter((a: any) => a.userId === child.id);
        const correct = attempts.filter((a: any) => a.isCorrect).length;
        const todayStats = getTodayProgress(child.id, date);
        const rank = getRank(child.points);
        return {
          childId: child.id,
          childName: child.displayName,
          totalAttempts: attempts.length,
          accuracy: attempts.length ? Number(((correct / attempts.length) * 100).toFixed(1)) : 0,
          points: child.points,
          level: child.level,
          rankTitle: rank.piece + " " + rank.title,
          todaySolve: todayStats.solveCount,
          todayBattle: todayStats.battleCount
        };
      });
    return { children };
  });

  // Parent: child detail page
  app.get("/parent/child/:id/detail", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user || user.role !== "parent") {
      return reply.code(403).send({ message: "仅家长可查看" });
    }
    const { id } = request.params as { id: string };
    if (!user.childIds.includes(id)) {
      return reply.code(403).send({ message: "未绑定该学生" });
    }
    const child = getUserById(id);
    if (!child) return reply.code(404).send({ message: "学生不存在" });

    const date = today();
    const attempts = db.attempts.filter((a) => a.userId === id);
    const correctAttempts = attempts.filter((a) => a.isCorrect);
    const recentAttempts = attempts.slice(-20).reverse();
    const recentMatches = db.matches
      .filter((m) => m.userId === id)
      .slice(-10)
      .reverse()
      .map((m) => ({
        id: m.id, mode: m.mode, difficulty: m.difficulty,
        result: m.result, createdAt: m.createdAt
      }));

    const homeworkAttempts = db.homeworkAttempts
      .filter((a) => a.userId === id)
      .slice(-20).reverse()
      .map((a) => {
        const hw = db.homeworks.find((h) => h.id === a.homeworkId);
        return {
          id: a.id, homeworkId: a.homeworkId,
          homeworkTitle: hw?.title ?? "未知作业",
          answer: a.answer, isCorrect: a.isCorrect,
          submittedAt: a.submittedAt
        };
      });

    const todayStats = getTodayProgress(id, date);
    const rank = getRank(child.points);

    return {
      childId: child.id,
      childName: child.displayName,
      points: child.points,
      level: child.level,
      rankTitle: rank.piece + " " + rank.title,
      totalAttempts: attempts.length,
      accuracy: attempts.length ? Number(((correctAttempts.length / attempts.length) * 100).toFixed(1)) : 0,
      todaySolve: todayStats.solveCount,
      todayBattle: todayStats.battleCount,
      recentAttempts: recentAttempts.map((a) => ({
        id: a.id, problemId: a.problemId, answer: a.answer,
        isCorrect: a.isCorrect, submittedAt: a.submittedAt
      })),
      recentMatches,
      homeworkAttempts
    };
  });

  // ── Weekly Reports ─────────────────────────────────────────

  // Parent: get weekly reports for a child
  app.get("/parent/child/:id/reports", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user || user.role !== "parent") {
      return reply.code(403).send({ message: "仅家长可查看" });
    }
    const { id } = request.params as { id: string };
    if (!user.childIds.includes(id)) {
      return reply.code(403).send({ message: "未绑定该学生" });
    }
    const reports = db.weeklyReports
      .filter((r) => r.studentId === id && r.parentId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10);
    return { items: reports };
  });

  // Parent: generate/refresh a weekly report for a child
  app.post("/parent/child/:id/generate-report", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user || user.role !== "parent") {
      return reply.code(403).send({ message: "仅家长可生成报告" });
    }
    const { id } = request.params as { id: string };
    if (!user.childIds.includes(id)) {
      return reply.code(403).send({ message: "未绑定该学生" });
    }

    const force = (request.query as any).force === "true";
    const { start } = getWeekRange(new Date());
    const existing = db.weeklyReports.find(
      (r) => r.studentId === id && r.parentId === userId && r.weekStart === start
    );
    // Return cached if exists and not forcing refresh
    if (existing && !force) return { report: existing, cached: true };
    // Delete old report if forcing refresh
    if (existing && force) {
      db.weeklyReports = db.weeklyReports.filter((r) => r.id !== existing.id);
    }

    try {
      const data = await generateWeeklyReport(id, userId);
      const { end } = getWeekRange(new Date());
      const report = {
        id: crypto.randomUUID(),
        studentId: id,
        parentId: userId,
        weekStart: start,
        weekEnd: end,
        ...data,
        createdAt: nowIso(),
      };
      db.weeklyReports.push(report);
      return { report, cached: false, refreshed: !!existing };
    } catch (e: any) {
      return reply.code(500).send({ message: "生成报告失败：" + (e.message || "未知错误") });
    }
  });

  // ── Study Plans ────────────────────────────────────────────

  app.post("/parent/study-plan", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user || user.role !== "parent") {
      return reply.code(403).send({ message: "仅家长可创建学习计划" });
    }
    const body = studyPlanBody.parse(request.body);
    if (!user.childIds.includes(body.childId)) {
      return reply.code(403).send({ message: "未绑定该学生" });
    }
    const plan = {
      id: crypto.randomUUID(),
      parentId: userId,
      childId: body.childId,
      dailySolveTarget: body.dailySolveTarget,
      dailyBattleTarget: body.dailyBattleTarget,
      startDate: body.startDate,
      endDate: body.endDate,
      createdAt: nowIso()
    };
    db.studyPlans.push(plan);
    return { plan };
  });

  app.get("/parent/study-plans", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user || user.role !== "parent") {
      return reply.code(403).send({ message: "仅家长可查看" });
    }
    const date = today();
    const plans = db.studyPlans
      .filter((p) => p.parentId === userId)
      .map((p) => {
        const child = getUserById(p.childId);
        const progress = getTodayProgress(p.childId, date);
        return {
          id: p.id,
          childId: p.childId,
          childName: child?.displayName ?? "未知",
          dailySolveTarget: p.dailySolveTarget,
          dailyBattleTarget: p.dailyBattleTarget,
          startDate: p.startDate,
          endDate: p.endDate,
          createdAt: p.createdAt,
          todaySolve: progress.solveCount,
          todayBattle: progress.battleCount,
          solveProgress: p.dailySolveTarget > 0
            ? Number(((progress.solveCount / p.dailySolveTarget) * 100).toFixed(0))
            : 100,
          battleProgress: p.dailyBattleTarget > 0
            ? Number(((progress.battleCount / p.dailyBattleTarget) * 100).toFixed(0))
            : 100
        };
      });
    return { plans };
  });

  app.put("/parent/study-plan/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const { id } = request.params as { id: string };
    const plan = db.studyPlans.find((p) => p.id === id);
    if (!plan) return reply.code(404).send({ message: "学习计划不存在" });
    if (plan.parentId !== userId) {
      return reply.code(403).send({ message: "无权修改" });
    }
    const body = studyPlanUpdateBody.parse(request.body);
    if (body.dailySolveTarget !== undefined) plan.dailySolveTarget = body.dailySolveTarget;
    if (body.dailyBattleTarget !== undefined) plan.dailyBattleTarget = body.dailyBattleTarget;
    if (body.startDate !== undefined) plan.startDate = body.startDate;
    if (body.endDate !== undefined) plan.endDate = body.endDate;
    return { plan };
  });

  app.delete("/parent/study-plan/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const { id } = request.params as { id: string };
    const plan = db.studyPlans.find((p) => p.id === id);
    if (!plan) return reply.code(404).send({ message: "学习计划不存在" });
    if (plan.parentId !== userId) {
      return reply.code(403).send({ message: "无权删除" });
    }
    db.studyPlans = db.studyPlans.filter((p) => p.id !== id);
    return { success: true };
  });
};
