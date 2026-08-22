import { FastifyPluginAsync } from "fastify";
import { Chess } from "chess.js";
import { z } from "zod";
import { authGuard } from "../middleware/auth.js";
import { db, addPoints } from "../services/db.js";
import { generateExplanation } from "../services/ai.js";
import { getUserById, nowIso, requireUserId } from "../services/common.js";

const listQuery = z.object({
  gradeBand: z.string().optional(),
  difficulty: z.coerce.number().min(1).max(5).optional()
});

const submitBody = z.object({
  problemId: z.string(),
  answer: z.string().min(1)
});

const explainBody = z.object({
  problemId: z.string(),
  answer: z.string().min(1),
  isCorrect: z.boolean()
});

const normalizeAnswer = (text: string): string => text.replace(/\s+/g, "").replace(/[+#?!]/g, "").toLowerCase();

const moveToUci = (move: { from: string; to: string; promotion?: string }): string => {
  return `${move.from}${move.to}${move.promotion ?? ""}`.toLowerCase();
};

const answerCandidates = (answers: Array<string | undefined>): string[] => {
  return answers
    .filter((item): item is string => Boolean(item))
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildAcceptedAnswerSet = (fen: string, answers: Array<string | undefined>): Set<string> => {
  const accepted = new Set<string>();

  for (const answer of answerCandidates(answers)) {
    accepted.add(normalizeAnswer(answer));

    try {
      const chess = new Chess(fen);
      const move = chess.move(answer, { strict: false });
      if (move) {
        accepted.add(normalizeAnswer(move.san));
        accepted.add(moveToUci(move));
      }
    } catch {
      // Keep the raw accepted answer even when it is a shorthand label, not a legal move.
    }
  }

  return accepted;
};

const isMateInOneProblem = (problem: (typeof db.problems)[number]): boolean => {
  return problem.type === "mate_in_1" || problem.question.includes("一步将死");
};

const judgeAnswer = (problem: (typeof db.problems)[number], answer: string): boolean => {
  const normalizedAnswer = normalizeAnswer(answer);
  const accepted = buildAcceptedAnswerSet(problem.fen, [problem.solution, problem.solutionUci, ...(problem.acceptedAnswers ?? [])]);

  if (accepted.has(normalizedAnswer)) {
    return true;
  }

  try {
    const chess = new Chess(problem.fen);
    const move = chess.move(answer, { strict: false });
    if (!move) {
      return false;
    }
    if (isMateInOneProblem(problem) && chess.isCheckmate()) {
      return true;
    }
    return accepted.has(normalizeAnswer(move.san)) || accepted.has(moveToUci(move));
  } catch {
    return false;
  }
};

export const problemRoutes: FastifyPluginAsync = async (app) => {
  app.get("/problems/list", { preHandler: [authGuard] }, async (request) => {
    const query = listQuery.parse(request.query);
    const list = db.problems.filter((problem) => {
      if (query.gradeBand && problem.gradeBand !== query.gradeBand) {
        return false;
      }
      if (query.difficulty && problem.difficulty !== query.difficulty) {
        return false;
      }
      return true;
    });
    return { items: list };
  });

  app.post("/problems/submit", { preHandler: [authGuard] }, async (request, reply) => {
    const body = submitBody.parse(request.body);
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user) {
      return reply.code(404).send({ message: "用户不存在" });
    }

    const problem = db.problems.find((item) => item.id === body.problemId);
    if (!problem) {
      return reply.code(404).send({ message: "题目不存在" });
    }

    const isCorrect = judgeAnswer(problem, body.answer);
    const alreadySolved = db.attempts.some((attempt) => attempt.userId === userId && attempt.problemId === problem.id && attempt.isCorrect);

    db.attempts.push({
      id: crypto.randomUUID(),
      userId,
      problemId: problem.id,
      answer: body.answer,
      isCorrect,
      submittedAt: nowIso()
    });

    const awardedPoints = isCorrect && !alreadySolved ? 15 : 0;
    if (awardedPoints > 0) {
      addPoints(userId, 15, "答题正确");
    }

    return {
      isCorrect,
      correctAnswer: problem.solution,
      correctUci: problem.solutionUci ?? null,
      alreadySolved: isCorrect ? alreadySolved : false,
      awardedPoints,
      points: user.points,
      level: user.level
    };
  });

  app.post("/problems/explain", { preHandler: [authGuard] }, async (request, reply) => {
    const body = explainBody.parse(request.body);
    const problem = db.problems.find((item) => item.id === body.problemId);
    if (!problem) {
      return reply.code(404).send({ message: "题目不存在" });
    }
    const user = getUserById(requireUserId(request));

    const explain = await generateExplanation({
      question: problem.question,
      answer: problem.solution,
      isCorrect: body.isCorrect,
      knowledgePoint: problem.knowledgePoint,
      audience: user?.role === "student" ? "child" : "general"
    });

    return {
      explanation: explain.text,
      source: explain.source
    };
  });
};
