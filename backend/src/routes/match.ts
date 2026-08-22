import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authGuard } from "../middleware/auth.js";
import { analyzePgn, checkVariantWin, playMove, startMatch, suggestMove, VARIANTS } from "../services/chess.js";
import { generatePgnAnalysis } from "../services/ai.js";
import { addPoints, db } from "../services/db.js";
import { getUserById, nowIso, requireUserId } from "../services/common.js";

const startBody = z.object({
  mode: z.enum(["standard", "teaching"]),
  difficulty: z.number().min(1).max(20),
  variant: z.string().optional()
});

const moveBody = z.object({
  matchId: z.string(),
  fen: z.string(),
  move: z.string(),
  difficulty: z.number().min(1).max(20),
  previousEngineMove: z.string().nullable().optional(),
  variant: z.string().optional()
});

const analyzeBody = z.object({
  pgn: z.string().min(1)
});

const suggestBody = z.object({
  fen: z.string(),
  difficulty: z.number().min(1).max(20)
});

export const matchRoutes: FastifyPluginAsync = async (app) => {
  // Get available battle variants
  app.get("/match/variants", { preHandler: [authGuard] }, async () => {
    return { items: Object.values(VARIANTS) };
  });

  // Get match history for current user
  app.get("/match/history", { preHandler: [authGuard] }, async (request) => {
    const userId = requireUserId(request);
    const items = db.matches
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    return { items };
  });

  app.post("/match/start", { preHandler: [authGuard] }, async (request) => {
    const body = startBody.parse(request.body);
    const userId = requireUserId(request);
    const state = startMatch({ mode: body.mode, difficulty: body.difficulty, variant: body.variant });
    const matchId = crypto.randomUUID();
    db.matches.push({
      id: matchId,
      userId,
      mode: body.mode,
      difficulty: body.difficulty,
      pgn: "",
      result: "draw",
      createdAt: nowIso()
    });
    return {
      matchId,
      ...state,
      variant: body.variant || "standard"
    };
  });

  app.post("/match/move", { preHandler: [authGuard] }, async (request, reply) => {
    const body = moveBody.parse(request.body);
    const result = await playMove({
      fen: body.fen,
      move: body.move,
      difficulty: body.difficulty,
      previousEngineMove: body.previousEngineMove ?? null
    });

    if (!result.playerMoveAccepted) {
      return reply.code(400).send({ message: "非法走子" });
    }

    // Check variant-specific win conditions
    const variantCheck = checkVariantWin(result.fenAfter, (body as any).variant || "standard");
    const isGameOver = result.gameOver || variantCheck.over;

    if (isGameOver) {
      const finalResult = variantCheck.result || result.gameResult || "draw";
      addPoints(requireUserId(request), finalResult === "win" ? 20 : 10, "完成人机对战");
      // Save PGN to match record
      const match = db.matches.find((m) => m.id === body.matchId);
      if (match) {
        match.pgn = (body as any).pgn || result.pgn || "";
        match.result = finalResult;
      }
      return { ...result, gameOver: true, gameResult: finalResult, variantWin: variantCheck.over, pgn: (body as any).pgn || "" };
    }

    return { ...result, pgn: (body as any).pgn || "" };
  });

  app.post("/match/suggest", { preHandler: [authGuard] }, async (request) => {
    const body = suggestBody.parse(request.body);
    const user = getUserById(requireUserId(request));
    return suggestMove({
      fen: body.fen,
      difficulty: body.difficulty,
      audience: user?.role === "student" ? "child" : "general"
    });
  });

  app.post("/match/analyze", { preHandler: [authGuard] }, async (request) => {
    const body = analyzeBody.parse(request.body);
    const user = getUserById(requireUserId(request));
    const audience = user?.role === "student" ? "child" : "general";
    const local = await analyzePgn(body.pgn, audience);
    const ai = await generatePgnAnalysis({
      pgn: body.pgn,
      localSummary: local.summary,
      keyMoves: local.keyMoves,
      audience
    });

    return {
      ...local,
      summary: ai.summary,
      source: ai.source
    };
  });
};
