import { FastifyInstance } from "fastify";
import { Chess } from "chess.js";
import { awardPvpPoints, db } from "./db.js";

// ── Types ─────────────────────────────────────────────────────────

interface WsMessage {
  type: string;
  payload?: Record<string, unknown>;
}

// ── Connection State ──────────────────────────────────────────────

/** userId -> WebSocket (only one active connection per user) */
const connections = new Map<string, WebSocket>();

/** roomId -> Set of userId currently in the room */
const roomClients = new Map<string, Set<string>>();

/** userId -> NodeJS.Timeout for disconnect forfeit */
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

const DISCONNECT_GRACE_MS = 60_000; // 60 seconds to reconnect
const CLOCK_TICK_MS = 1000; // broadcast clock every second
const clockIntervals = new Map<string, ReturnType<typeof setInterval>>();

// ── Chat limits ───────────────────────────────────────────────────

const CHAT_MESSAGE_MAX_LENGTH = 2000;
const chatBannedWords = ["政治敏感", "暴力鼓动", "不良引导"];

// ── Helpers ───────────────────────────────────────────────────────

function send(ws: WebSocket, msg: WsMessage): void {
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  } catch {
    // socket may not be ready
  }
}

function broadcastToRoom(roomId: string, msg: WsMessage): void {
  const members = roomClients.get(roomId);
  if (!members) return;
  for (const uid of members) {
    const ws = connections.get(uid);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}

function sendToUser(userId: string, msg: WsMessage): void {
  const ws = connections.get(userId);
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function roomStateMessage(room: typeof db.gameRooms[number]): WsMessage {
  const whiteName = room.players.white
    ? db.users.find((u) => u.id === room.players.white!.userId)?.displayName ?? "白方"
    : "等待中";
  const blackName = room.players.black
    ? db.users.find((u) => u.id === room.players.black!.userId)?.displayName ?? "黑方"
    : "等待中";
  return {
    type: "game_state",
    payload: {
      roomId: room.id,
      roomNumber: room.roomNumber,
      fen: room.fen,
      pgn: room.pgn,
      turn: room.turn,
      status: room.status,
      result: room.result,
      resultReason: room.resultReason,
      white: { userId: room.players.white?.userId ?? null, name: whiteName, timeRemainingMs: room.players.white?.timeRemainingMs ?? 0 },
      black: { userId: room.players.black?.userId ?? null, name: blackName, timeRemainingMs: room.players.black?.timeRemainingMs ?? 0 },
      timeControl: room.timeControl,
      drawOfferFrom: room.drawOfferFrom,
    },
  };
}

function generateRoomNumber(): string {
  // 6-digit numeric room code
  while (true) {
    const num = String(Math.floor(100000 + Math.random() * 900000));
    if (!db.gameRooms.some((r) => r.roomNumber === num && r.status !== "finished")) {
      return num;
    }
  }
}

// ── Validate session ──────────────────────────────────────────────

function validateToken(token: string): { userId: string } | null {
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) return null;
  return { userId: session.userId };
}

// ── Clock Management ──────────────────────────────────────────────

function startClock(roomId: string): void {
  stopClock(roomId);
  const room = db.gameRooms.find((r) => r.id === roomId);
  if (!room || room.status !== "playing") return;

  const interval = setInterval(() => {
    const r = db.gameRooms.find((x) => x.id === roomId);
    if (!r || r.status !== "playing") {
      stopClock(roomId);
      return;
    }

    const now = Date.now();
    const lastMove = new Date(r.lastMoveTimestamp).getTime();
    const elapsed = now - lastMove;

    // Update the active player's remaining time
    const activePlayer = r.turn === "w" ? r.players.white : r.players.black;
    if (activePlayer) {
      activePlayer.timeRemainingMs = Math.max(0, activePlayer.timeRemainingMs - CLOCK_TICK_MS);
    }

    // Broadcast clock tick
    broadcastToRoom(roomId, {
      type: "clock_tick",
      payload: {
        whiteTimeMs: r.players.white?.timeRemainingMs ?? 0,
        blackTimeMs: r.players.black?.timeRemainingMs ?? 0,
        turn: r.turn,
      },
    });

    // Check timeout
    if (activePlayer && activePlayer.timeRemainingMs <= 0) {
      stopClock(roomId);
      handleTimeout(roomId, r.turn);
    }
  }, CLOCK_TICK_MS);

  clockIntervals.set(roomId, interval);
}

function stopClock(roomId: string): void {
  const existing = clockIntervals.get(roomId);
  if (existing) {
    clearInterval(existing);
    clockIntervals.delete(roomId);
  }
}

function handleTimeout(roomId: string, timedOutColor: "w" | "b"): void {
  const room = db.gameRooms.find((r) => r.id === roomId);
  if (!room || room.status === "finished") return;

  room.status = "finished";
  room.result = timedOutColor === "w" ? "black" : "white";
  room.resultReason = "timeout";

  awardPvpPoints(
    room.players.white?.userId,
    room.players.black?.userId,
    room.result,
    "超时"
  );

  broadcastToRoom(roomId, {
    type: "game_over",
    payload: {
      result: room.result,
      reason: "timeout",
      message: timedOutColor === "w" ? "白方超时，黑方获胜！" : "黑方超时，白方获胜！",
    },
  });

  cleanupRoom(roomId);
}

// ── Game Logic ────────────────────────────────────────────────────

function handleMove(userId: string, payload: Record<string, unknown>): void {
  const roomId = payload.roomId as string;
  const san = payload.move as string;

  const room = db.gameRooms.find((r) => r.id === roomId);
  if (!room) {
    sendToUser(userId, { type: "error", payload: { message: "房间不存在" } });
    return;
  }
  if (room.status !== "playing") {
    sendToUser(userId, { type: "error", payload: { message: "游戏未在进行中" } });
    return;
  }

  // Determine player color
  const isWhite = room.players.white?.userId === userId;
  const isBlack = room.players.black?.userId === userId;
  if (!isWhite && !isBlack) {
    sendToUser(userId, { type: "error", payload: { message: "你不是本局的玩家" } });
    return;
  }
  const playerColor = isWhite ? "w" : "b";

  // Check it's this player's turn
  if (room.turn !== playerColor) {
    sendToUser(userId, { type: "error", payload: { message: "还没轮到你走棋" } });
    return;
  }

  // Validate move with chess.js
  const chess = new Chess(room.fen);
  let moveResult: ReturnType<typeof chess.move>;
  try {
    moveResult = chess.move(san);
  } catch {
    sendToUser(userId, { type: "error", payload: { message: "无效的走法" } });
    return;
  }

  if (!moveResult) {
    sendToUser(userId, { type: "error", payload: { message: "不合法的走法" } });
    return;
  }

  // Calculate time: deduct elapsed, add increment
  const now = Date.now();
  const lastMove = new Date(room.lastMoveTimestamp).getTime();
  const elapsed = now - lastMove;

  const activePlayer = playerColor === "w" ? room.players.white : room.players.black;
  if (activePlayer) {
    activePlayer.timeRemainingMs = Math.max(0, activePlayer.timeRemainingMs - elapsed);
    if (activePlayer.timeRemainingMs <= 0) {
      handleTimeout(roomId, playerColor as "w" | "b");
      return;
    }
    activePlayer.timeRemainingMs += room.timeControl.incrementSeconds * 1000;
  }

  // Update room state
  room.fen = chess.fen();
  room.pgn = chess.pgn();
  room.turn = room.turn === "w" ? "b" : "w";
  room.lastMoveTimestamp = new Date().toISOString();
  room.drawOfferFrom = null; // any move cancels draw offer

  // Check for game end
  if (chess.isGameOver()) {
    stopClock(roomId);
    room.status = "finished";

    if (chess.isCheckmate()) {
      room.result = playerColor === "w" ? "white" : "black";
      room.resultReason = "checkmate";
    } else if (chess.isStalemate()) {
      room.result = "draw";
      room.resultReason = "stalemate";
    } else if (chess.isDraw()) {
      room.result = "draw";
      room.resultReason = "draw";
    }

    broadcastToRoom(roomId, {
      type: "game_over",
      payload: {
        result: room.result,
        reason: room.resultReason,
        fen: room.fen,
        pgn: room.pgn,
        message:
          room.resultReason === "checkmate"
            ? `${playerColor === "w" ? "白方" : "黑方"}将杀获胜！`
            : "平局！",
      },
    });

    // Record results
    if (room.players.white) {
      db.matches.push({
        id: crypto.randomUUID(),
        userId: room.players.white.userId,
        mode: "standard",
        difficulty: 10,
        pgn: room.pgn,
        result: room.result === "white" ? "win" : room.result === "black" ? "lose" : "draw",
        createdAt: new Date().toISOString(),
      });
    }
    if (room.players.black) {
      db.matches.push({
        id: crypto.randomUUID(),
        userId: room.players.black.userId,
        mode: "standard",
        difficulty: 10,
        pgn: room.pgn,
        result: room.result === "black" ? "win" : room.result === "white" ? "lose" : "draw",
        createdAt: new Date().toISOString(),
      });
    }

    awardPvpPoints(
      room.players.white?.userId,
      room.players.black?.userId,
      room.result!,
      room.resultReason === "checkmate" ? "将杀" : "规则"
    );

    cleanupRoom(roomId);
    return;
  }

  // Broadcast updated game state
  broadcastToRoom(roomId, roomStateMessage(room));
  room.lastMoveTimestamp = new Date().toISOString();
}

function handleResign(userId: string, payload: Record<string, unknown>): void {
  const roomId = payload.roomId as string;
  const room = db.gameRooms.find((r) => r.id === roomId);
  if (!room || room.status !== "playing") return;

  const isWhite = room.players.white?.userId === userId;
  const isBlack = room.players.black?.userId === userId;
  if (!isWhite && !isBlack) return;

  room.status = "finished";
  room.result = isWhite ? "black" : "white";
  room.resultReason = "resign";
  stopClock(roomId);

  broadcastToRoom(roomId, {
    type: "game_over",
    payload: {
      result: room.result,
      reason: "resign",
      message: `${isWhite ? "白方" : "黑方"}认输，${isWhite ? "黑方" : "白方"}获胜！`,
    },
  });

  if (room.players.white) {
    db.matches.push({
      id: crypto.randomUUID(),
      userId: room.players.white.userId,
      mode: "standard",
      difficulty: 10,
      pgn: room.pgn,
      result: isWhite ? "lose" : "win",
      createdAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
    });
  }

  awardPvpPoints(
    room.players.white?.userId,
    room.players.black?.userId,
    room.result!,
    "认输"
  );

  cleanupRoom(roomId);
}

function handleDrawOffer(userId: string, payload: Record<string, unknown>): void {
  const roomId = payload.roomId as string;
  const action = (payload.action as string) || "offer";
  const room = db.gameRooms.find((r) => r.id === roomId);
  if (!room || room.status !== "playing") return;

  const isWhite = room.players.white?.userId === userId;
  const isBlack = room.players.black?.userId === userId;
  if (!isWhite && !isBlack) return;

  const opponentId = isWhite ? room.players.black?.userId : room.players.white?.userId;

  if (action === "offer") {
    room.drawOfferFrom = userId;
    sendToUser(userId, { type: "draw_offer_sent", payload: {} });
    if (opponentId) {
      const userName = db.users.find((u) => u.id === userId)?.displayName ?? "对手";
      sendToUser(opponentId, {
        type: "draw_offered",
        payload: { fromUserId: userId, fromName: userName },
      });
    }
  } else if (action === "accept") {
    if (room.drawOfferFrom && room.drawOfferFrom !== userId) {
      room.status = "finished";
      room.result = "draw";
      room.resultReason = "draw";
      stopClock(roomId);
      broadcastToRoom(roomId, {
        type: "game_over",
        payload: { result: "draw", reason: "draw", message: "双方同意和棋！" },
      });
      [room.players.white, room.players.black].forEach((p) => {
        if (!p) return;
        db.matches.push({
          id: crypto.randomUUID(),
          userId: p.userId,
          mode: "standard",
          difficulty: 10,
          pgn: room.pgn,
          result: "draw",
          createdAt: new Date().toISOString(),
        });
      });
      awardPvpPoints(
        room.players.white?.userId,
        room.players.black?.userId,
        "draw",
        "协议和棋"
      );
      cleanupRoom(roomId);
    }
  } else if (action === "reject") {
    room.drawOfferFrom = null;
    broadcastToRoom(roomId, { type: "draw_rejected", payload: {} });
  }
}

// ── Chat ──────────────────────────────────────────────────────────

function handleChatSend(userId: string, payload: Record<string, unknown>): void {
  const toUserId = payload.toUserId as string;
  const message = (payload.message as string)?.trim();
  if (!toUserId || !message) return;
  if (message.length > CHAT_MESSAGE_MAX_LENGTH) {
    sendToUser(userId, { type: "error", payload: { message: `消息不能超过${CHAT_MESSAGE_MAX_LENGTH}个字符` } });
    return;
  }
  if (chatBannedWords.some((w) => message.includes(w))) {
    sendToUser(userId, { type: "error", payload: { message: "消息包含不当内容" } });
    return;
  }

  const msg = {
    id: crypto.randomUUID(),
    fromUserId: userId,
    toUserId,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.chatMessages.push(msg);

  const fromUser = db.users.find((u) => u.id === userId);

  sendToUser(userId, {
    type: "chat_receive",
    payload: {
      id: msg.id,
      fromUserId: userId,
      fromName: fromUser?.displayName ?? "我",
      toUserId,
      message,
      createdAt: msg.createdAt,
      outgoing: true,
    },
  });

  sendToUser(toUserId, {
    type: "chat_receive",
    payload: {
      id: msg.id,
      fromUserId: userId,
      fromName: fromUser?.displayName ?? "未知",
      toUserId,
      message,
      createdAt: msg.createdAt,
      outgoing: false,
    },
  });
}

// ── Room Cleanup ──────────────────────────────────────────────────

function cleanupRoom(roomId: string): void {
  stopClock(roomId);
  roomClients.delete(roomId);
}

// ── Connection setup ──────────────────────────────────────────────

function setupConnection(userId: string, socket: WebSocket, app: FastifyInstance): void {
  const existingTimer = disconnectTimers.get(userId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    disconnectTimers.delete(userId);
  }

  const oldWs = connections.get(userId);
  if (oldWs && oldWs !== socket) {
    try { oldWs.close(); } catch { /* ignore */ }
  }
  connections.set(userId, socket);

  for (const [roomId, members] of roomClients) {
    if (members.has(userId)) {
      const room = db.gameRooms.find((r) => r.id === roomId);
      if (room && room.status === "playing") {
        send(socket, roomStateMessage(room));
      }
    }
  }
}

// ── Main WebSocket Handler ────────────────────────────────────────

export async function registerWebSocket(app: FastifyInstance): Promise<void> {
  app.get("/ws", { websocket: true }, (socket, req) => {
    let userId: string | null = null;

    // Pre-validate token from URL query parameter
    const url = new URL(req.url ?? "/", "http://localhost");
    const urlToken = url.searchParams.get("token");
    if (urlToken) {
      const result = validateToken(urlToken);
      if (result) {
        userId = result.userId;
        setupConnection(userId, socket, app);
        send(socket, { type: "auth_ok", payload: { userId } });
        const user = db.users.find((u) => u.id === userId);
        app.log.info({ userId, userName: user?.displayName ?? userId }, "ws user connected");
      }
    }

    socket.on("message", (raw: Buffer) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(socket, { type: "error", payload: { message: "无效的 JSON" } });
        return;
      }

      // ── Auth (via message, for backward compat) ──────────
      if (msg.type === "auth") {
        const token = (msg.payload as Record<string, unknown>)?.token as string;
        if (!token) {
          send(socket, { type: "error", payload: { message: "缺少 token" } });
          return;
        }
        const result = validateToken(token);
        if (!result) {
          send(socket, { type: "error", payload: { message: "无效的 token" } });
          return;
        }
        userId = result.userId;
        setupConnection(userId, socket, app);
        send(socket, { type: "auth_ok", payload: { userId } });
        const user = db.users.find((u) => u.id === userId);
        app.log.info({ userId, userName: user?.displayName ?? userId }, "ws user connected");
        return;
      }

      // Require auth for all other messages
      if (!userId) {
        send(socket, { type: "error", payload: { message: "请先认证" } });
        return;
      }

      switch (msg.type) {
        case "move":
          handleMove(userId, msg.payload ?? {});
          break;
        case "resign":
          handleResign(userId, msg.payload ?? {});
          break;
        case "draw_offer":
          handleDrawOffer(userId, msg.payload ?? {});
          break;
        case "chat_send":
          handleChatSend(userId, msg.payload ?? {});
          break;
        case "join_room": {
          const roomId = (msg.payload as Record<string, unknown>)?.roomId as string;
          if (!roomId) return;
          if (!roomClients.has(roomId)) {
            roomClients.set(roomId, new Set());
          }
          roomClients.get(roomId)!.add(userId);
          const room = db.gameRooms.find((r) => r.id === roomId);
          if (room) {
            if (room.status === "waiting" && room.players.white && room.players.black) {
              room.status = "playing";
              room.lastMoveTimestamp = new Date().toISOString();
              broadcastToRoom(roomId, roomStateMessage(room));
              startClock(roomId);
            } else {
              send(socket, roomStateMessage(room));
            }
          }
          break;
        }
        case "ping":
          send(socket, { type: "pong", payload: {} });
          break;
        default:
          send(socket, { type: "error", payload: { message: `未知消息类型: ${msg.type}` } });
      }
    });

    socket.on("close", () => {
      if (!userId) return;

      const userName = db.users.find((u) => u.id === userId)?.displayName ?? userId;
      app.log.info({ userId, userName }, "ws user disconnected");

      for (const [roomId, members] of roomClients) {
        if (members.has(userId)) {
          const room = db.gameRooms.find((r) => r.id === roomId);
          if (room && room.status === "playing") {
            const isWhite = room.players.white?.userId === userId;
            const isBlack = room.players.black?.userId === userId;
            if (isWhite || isBlack) {
              const opponentColor: "white" | "black" = isWhite ? "black" : "white";
              const opponentId = room.players[opponentColor]?.userId;
              if (opponentId) {
                sendToUser(opponentId, {
                  type: "opponent_disconnected",
                  payload: {
                    message: "对手已断开连接，等待60秒重连...",
                    graceSeconds: 60,
                  },
                });
              }

              const timer = setTimeout(() => {
                if (room.status === "playing") {
                  room.status = "finished";
                  room.result = opponentColor;
                  room.resultReason = "timeout";
                  stopClock(roomId);
                  broadcastToRoom(roomId, {
                    type: "game_over",
                    payload: {
                      result: room.result,
                      reason: "disconnect",
                      message: `${isWhite ? "白方" : "黑方"}断开连接超时，${opponentColor === "white" ? "白方" : "黑方"}获胜！`,
                    },
                  });
                  awardPvpPoints(
                    room.players.white?.userId,
                    room.players.black?.userId,
                    room.result!,
                    "断线超时"
                  );
                  cleanupRoom(roomId);
                }
                disconnectTimers.delete(userId!);
              }, DISCONNECT_GRACE_MS);
              disconnectTimers.set(userId, timer);
            }
          }
        }
      }
    });
  });
}
