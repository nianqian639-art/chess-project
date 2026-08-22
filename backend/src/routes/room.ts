import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Chess } from "chess.js";
import { authGuard } from "../middleware/auth.js";
import { awardPvpPoints, db } from "../services/db.js";
import { nowIso, requireUserId, getUserById } from "../services/common.js";

const createBody = z.object({
  timeControl: z.object({
    initialMinutes: z.number().min(0).max(120),
    incrementSeconds: z.number().min(0).max(300),
  }),
  asColor: z.enum(["white", "black", "random"]).default("random"),
});

const joinBody = z.object({
  roomNumber: z.string().min(1),
});

const resignBody = z.object({});
const drawBody = z.object({
  action: z.enum(["offer", "accept", "reject"]),
});

function generateRoomNumber(): string {
  while (true) {
    const num = String(Math.floor(100000 + Math.random() * 900000));
    if (!db.gameRooms.some((r) => r.roomNumber === num && r.status !== "finished")) {
      return num;
    }
  }
}

export const roomRoutes: FastifyPluginAsync = async (app) => {
  // ── Create Room ──────────────────────────────────────────────
  app.post("/room/create", { preHandler: [authGuard] }, async (request) => {
    const body = createBody.parse(request.body);
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user) throw new Error("用户不存在");

    const chess = new Chess();
    const roomNumber = generateRoomNumber();
    const totalMs = body.timeControl.initialMinutes * 60 * 1000;

    let whiteUserId = userId;
    let blackUserId: string | null = null;

    if (body.asColor === "black") {
      whiteUserId = userId;
      blackUserId = null; // will be set when opponent joins, but creator wants black
    }

    // Determine who gets which color
    const assignWhite = body.asColor === "black" ? null : userId;
    const assignBlack = body.asColor === "black" ? userId : null;

    const room = {
      id: crypto.randomUUID(),
      roomNumber,
      creatorId: userId,
      timeControl: body.timeControl,
      players: {
        white: assignWhite ? { userId: assignWhite, timeRemainingMs: totalMs } : null,
        black: assignBlack ? { userId: assignBlack, timeRemainingMs: totalMs } : null,
      },
      fen: chess.fen(),
      pgn: "",
      turn: "w" as const,
      status: "waiting" as const,
      result: null,
      drawOfferFrom: null,
      lastMoveTimestamp: nowIso(),
      createdAt: nowIso(),
    };

    db.gameRooms.push(room);

    return {
      roomId: room.id,
      roomNumber: room.roomNumber,
      timeControl: room.timeControl,
      yourColor: assignWhite ? "white" : "black",
      status: room.status,
    };
  });

  // ── Join Room ─────────────────────────────────────────────────
  app.post("/room/join", { preHandler: [authGuard] }, async (request, reply) => {
    const body = joinBody.parse(request.body);
    const userId = requireUserId(request);
    const user = getUserById(userId);
    if (!user) return reply.code(400).send({ message: "用户不存在" });

    const room = db.gameRooms.find(
      (r) => r.roomNumber === body.roomNumber && r.status === "waiting"
    );
    if (!room) {
      return reply.code(404).send({ message: "房间不存在或已开始" });
    }

    // Can't join your own room as opponent
    if (room.creatorId === userId) {
      return reply.code(400).send({ message: "不能加入自己创建的房间" });
    }

    const totalMs = room.timeControl.initialMinutes * 60 * 1000;

    // Assign the open slot
    if (!room.players.white && room.players.black?.userId !== userId) {
      room.players.white = { userId, timeRemainingMs: totalMs };
    } else if (!room.players.black && room.players.white?.userId !== userId) {
      room.players.black = { userId, timeRemainingMs: totalMs };
    } else if (room.players.white?.userId === userId || room.players.black?.userId === userId) {
      // Rejoining own room
      room.status = "playing";
      room.lastMoveTimestamp = nowIso();
      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        yourColor: room.players.white?.userId === userId ? "white" : "black",
        fen: room.fen,
        status: room.status,
        timeControl: room.timeControl,
      };
    } else {
      return reply.code(400).send({ message: "房间已满" });
    }

    room.status = "playing";
    room.lastMoveTimestamp = nowIso();

    return {
      roomId: room.id,
      roomNumber: room.roomNumber,
      yourColor: room.players.white?.userId === userId ? "white" : "black",
      fen: room.fen,
      status: room.status,
      timeControl: room.timeControl,
    };
  });

  // ── Get Room State ────────────────────────────────────────────
  app.get("/room/:id", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const room = db.gameRooms.find((r) => r.id === id);
    if (!room) return reply.code(404).send({ message: "房间不存在" });

    const whiteName = room.players.white
      ? db.users.find((u) => u.id === room.players.white!.userId)?.displayName ?? "白方"
      : "等待中";
    const blackName = room.players.black
      ? db.users.find((u) => u.id === room.players.black!.userId)?.displayName ?? "黑方"
      : "等待中";

    return {
      roomId: room.id,
      roomNumber: room.roomNumber,
      fen: room.fen,
      pgn: room.pgn,
      turn: room.turn,
      status: room.status,
      result: room.result,
      resultReason: room.resultReason,
      white: {
        userId: room.players.white?.userId ?? null,
        name: whiteName,
        timeRemainingMs: room.players.white?.timeRemainingMs ?? 0,
      },
      black: {
        userId: room.players.black?.userId ?? null,
        name: blackName,
        timeRemainingMs: room.players.black?.timeRemainingMs ?? 0,
      },
      timeControl: room.timeControl,
      drawOfferFrom: room.drawOfferFrom,
    };
  });

  // ── Resign ────────────────────────────────────────────────────
  app.post("/room/:id/resign", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = requireUserId(request);
    const room = db.gameRooms.find((r) => r.id === id);
    if (!room) return reply.code(404).send({ message: "房间不存在" });
    if (room.status !== "playing") return reply.code(400).send({ message: "游戏未在进行中" });

    const isWhite = room.players.white?.userId === userId;
    const isBlack = room.players.black?.userId === userId;
    if (!isWhite && !isBlack) return reply.code(403).send({ message: "你不是本局的玩家" });

    room.status = "finished";
    room.result = isWhite ? "black" : "white";
    room.resultReason = "resign";

    // Record results
    if (room.players.white) {
      db.matches.push({
        id: crypto.randomUUID(),
        userId: room.players.white.userId,
        mode: "standard",
        difficulty: 10,
        pgn: room.pgn,
        result: isWhite ? "lose" : "win",
        createdAt: nowIso(),
      });
    }
    if (room.players.black) {
      db.matches.push({
        id: crypto.randomUUID(),
        userId: room.players.black.userId,
        mode: "standard",
        difficulty: 10,
        pgn: room.pgn,
        result: isBlack ? "lose" : "win",
        createdAt: nowIso(),
      });
    }

    awardPvpPoints(
      room.players.white?.userId,
      room.players.black?.userId,
      room.result!,
      "认输"
    );

    return { result: room.result, reason: "resign" };
  });

  // ── Draw Offer ────────────────────────────────────────────────
  app.post("/room/:id/draw", { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = requireUserId(request);
    const body = drawBody.parse(request.body);
    const room = db.gameRooms.find((r) => r.id === id);
    if (!room) return reply.code(404).send({ message: "房间不存在" });
    if (room.status !== "playing") return reply.code(400).send({ message: "游戏未在进行中" });

    if (body.action === "offer") {
      room.drawOfferFrom = userId;
      return { drawOffered: true };
    } else if (body.action === "accept") {
      if (room.drawOfferFrom && room.drawOfferFrom !== userId) {
        room.status = "finished";
        room.result = "draw";
        room.resultReason = "draw";
        // Record draw for both
        [room.players.white, room.players.black].forEach((p) => {
          if (!p) return;
          db.matches.push({
            id: crypto.randomUUID(),
            userId: p.userId,
            mode: "standard",
            difficulty: 10,
            pgn: room.pgn,
            result: "draw",
            createdAt: nowIso(),
          });
        });
        awardPvpPoints(
          room.players.white?.userId,
          room.players.black?.userId,
          "draw",
          "协议和棋"
        );
        return { result: "draw", reason: "draw" };
      }
      return reply.code(400).send({ message: "没有待响应的和棋请求" });
    } else {
      room.drawOfferFrom = null;
      return { drawRejected: true };
    }
  });

  // ── List Active (Waiting) Rooms ────────────────────────────────
  app.get("/rooms/active", { preHandler: [authGuard] }, async () => {
    const waiting = db.gameRooms
      .filter((r) => r.status === "waiting")
      .map((r) => {
        const creator = db.users.find((u) => u.id === r.creatorId);
        return {
          roomId: r.id,
          roomNumber: r.roomNumber,
          creatorName: creator?.displayName ?? "未知",
          timeControl: r.timeControl,
          createdAt: r.createdAt,
        };
      });
    return { rooms: waiting };
  });

  // ── My Active Game ────────────────────────────────────────────
  app.get("/room/my-active", { preHandler: [authGuard] }, async (request) => {
    const userId = requireUserId(request);
    const room = db.gameRooms.find(
      (r) =>
        (r.status === "playing" || r.status === "waiting") &&
        (r.players.white?.userId === userId || r.players.black?.userId === userId)
    );
    if (!room) return { active: false };

    return {
      active: true,
      roomId: room.id,
      roomNumber: room.roomNumber,
      status: room.status,
      yourColor: room.players.white?.userId === userId ? "white" : "black",
      timeControl: room.timeControl,
    };
  });
};
