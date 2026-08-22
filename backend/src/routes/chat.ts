import { FastifyPluginAsync } from "fastify";
import { authGuard } from "../middleware/auth.js";
import { db } from "../services/db.js";
import { requireUserId } from "../services/common.js";

export const chatRoutes: FastifyPluginAsync = async (app) => {
  // ── Chat History ──────────────────────────────────────────────
  app.get("/chat/history/:friendId", { preHandler: [authGuard] }, async (request) => {
    const userId = requireUserId(request);
    const { friendId } = request.params as { friendId: string };

    const messages = db.chatMessages
      .filter(
        (m) =>
          (m.fromUserId === userId && m.toUserId === friendId) ||
          (m.fromUserId === friendId && m.toUserId === userId)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-100)
      .map((m) => ({
        id: m.id,
        fromUserId: m.fromUserId,
        toUserId: m.toUserId,
        message: m.message,
        createdAt: m.createdAt,
        outgoing: m.fromUserId === userId,
      }));

    // Mark messages as read
    db.chatMessages.forEach((m) => {
      if (m.fromUserId === friendId && m.toUserId === userId && !m.read) {
        m.read = true;
      }
    });

    return { messages };
  });

  // ── Unread Counts ─────────────────────────────────────────────
  app.get("/chat/unread", { preHandler: [authGuard] }, async (request) => {
    const userId = requireUserId(request);

    const unreadByFriend: Record<string, number> = {};
    db.chatMessages
      .filter((m) => m.toUserId === userId && !m.read)
      .forEach((m) => {
        unreadByFriend[m.fromUserId] = (unreadByFriend[m.fromUserId] || 0) + 1;
      });

    const total = Object.values(unreadByFriend).reduce((a, b) => a + b, 0);

    return { total, byFriend: unreadByFriend };
  });
};
