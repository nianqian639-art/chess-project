import { FastifyPluginAsync } from "fastify";
import { Chess } from "chess.js";
import { authGuard } from "../middleware/auth.js";
import { db } from "../services/db.js";
import { getUserById, nowIso, requireUserId } from "../services/common.js";

// ── Arena queue (in-memory) ──────────────────────────────────

interface ArenaEntry {
  userId: string;
  joinedAt: string;
}

const arenaQueue: ArenaEntry[] = [];

function generateRoomNumber(): string {
  while (true) {
    const num = String(Math.floor(100000 + Math.random() * 900000));
    if (!db.gameRooms.some((r) => r.roomNumber === num && r.status !== "finished")) {
      return num;
    }
  }
}

export const arenaRoutes: FastifyPluginAsync = async (app) => {
  // ── Join Arena ──────────────────────────────────────────────
  app.post("/arena/join", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user) return reply.code(404).send({ message: "用户不存在" });

    // Check if already in queue
    if (arenaQueue.some((e) => e.userId === userId)) {
      return reply.code(400).send({ message: "你已在匹配队列中" });
    }

    // Check if already in an active game
    const inActive = db.gameRooms.some(
      (r) =>
        (r.status === "playing" || r.status === "waiting") &&
        (r.players.white?.userId === userId || r.players.black?.userId === userId)
    );
    if (inActive) return reply.code(400).send({ message: "你已有进行中的对局" });

    arenaQueue.push({ userId, joinedAt: nowIso() });

    // Check if we can match
    if (arenaQueue.length >= 2) {
      const p1 = arenaQueue.shift()!;
      const p2 = arenaQueue.shift()!;

      const chess = new Chess();
      const timeControl = { initialMinutes: 10, incrementSeconds: 0 };
      const totalMs = timeControl.initialMinutes * 60 * 1000;

      const room = {
        id: crypto.randomUUID(),
        roomNumber: generateRoomNumber(),
        creatorId: p1.userId,
        timeControl,
        players: {
          white: { userId: p1.userId, timeRemainingMs: totalMs },
          black: { userId: p2.userId, timeRemainingMs: totalMs },
        },
        fen: chess.fen(),
        pgn: "",
        turn: "w" as const,
        status: "playing" as const,
        result: null,
        drawOfferFrom: null,
        lastMoveTimestamp: nowIso(),
        createdAt: nowIso(),
      };
      db.gameRooms.push(room);

      return {
        matched: true,
        roomId: room.id,
        roomNumber: room.roomNumber,
        yourColor: "white",
        timeControl,
      };
    }

    return { matched: false, queuePosition: arenaQueue.length };
  });

  // ── Leave Arena Queue ───────────────────────────────────────
  app.post("/arena/leave", { preHandler: [authGuard] }, async (request, reply) => {
    const userId = requireUserId(request);
    const idx = arenaQueue.findIndex((e) => e.userId === userId);
    if (idx < 0) return reply.code(400).send({ message: "你不在匹配队列中" });
    arenaQueue.splice(idx, 1);
    return { left: true };
  });

  // ── Arena Status ────────────────────────────────────────────
  app.get("/arena/status", { preHandler: [authGuard] }, async (request) => {
    const userId = requireUserId(request);
    const inQueue = arenaQueue.findIndex((e) => e.userId === userId);
    return {
      queueSize: arenaQueue.length,
      inQueue: inQueue >= 0,
      queuePosition: inQueue >= 0 ? inQueue + 1 : 0,
    };
  });

  // ── Arena Stats (Leaderboard) ───────────────────────────────
  app.get("/arena/stats", { preHandler: [authGuard] }, async () => {
    const stats = db.users
      .filter((u) => {
        const wins = db.matches.filter((m) => m.userId === u.id && m.result === "win").length;
        return wins > 0;
      })
      .sort((a, b) => {
        const aW = db.matches.filter((m) => m.userId === a.id && m.result === "win").length;
        const bW = db.matches.filter((m) => m.userId === b.id && m.result === "win").length;
        return bW - aW;
      })
      .slice(0, 50)
      .map((u, i) => {
        const wins = db.matches.filter((m) => m.userId === u.id && m.result === "win").length;
        const losses = db.matches.filter((m) => m.userId === u.id && m.result === "lose").length;
        const draws = db.matches.filter((m) => m.userId === u.id && m.result === "draw").length;
        const total = wins + losses + draws;
        return {
          rank: i + 1,
          userId: u.id,
          name: u.displayName,
          points: u.points,
          wins,
          losses,
          draws,
          totalGames: total,
          winRate: total > 0 ? ((wins / total) * 100).toFixed(1) + "%" : "0%",
        };
      });

    return { items: stats, queueSize: arenaQueue.length };
  });
};
