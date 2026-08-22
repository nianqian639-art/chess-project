import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { arenaRoutes } from "./routes/arena.js";
import { authRoutes } from "./routes/auth.js";
import { chatRoutes } from "./routes/chat.js";
import { classRoutes } from "./routes/class.js";
import { demoRoutes } from "./routes/demo.js";
import { friendsRoutes } from "./routes/friends.js";
import { gameRequestRoutes } from "./routes/game-request.js";
import { matchRoutes } from "./routes/match.js";
import { progressionRoutes } from "./routes/progression.js";
import { problemRoutes } from "./routes/problems.js";
import { parentRoutes } from "./routes/parent.js";
import { rankingRoutes } from "./routes/rankings.js";
import { roomRoutes } from "./routes/room.js";
import { registerWebSocket } from "./services/websocket.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// In dev: src/server.ts -> ../public, in prod: dist/server.js -> ../public (copied by build)
const publicDir = resolve(__dirname, "..", "public");

export const buildServer = () => {
  const app = Fastify({
    logger: true,
    trustProxy: true,
    bodyLimit: 1048576, // 1MB
  });

  app.register(cors, {
    origin: process.env.NODE_ENV === "production"
      ? [/^https?:\/\/(.*\.)?chesstong\.com$/, /^https?:\/\/localhost(:\d+)?$/]
      : true,
  });
  app.register(sensible);
  app.register(websocket);

  // Serve static frontend files (CSS, JS, images)
  app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/",
    index: false,
    list: false,
  });

  // HTML pages
  app.get("/", async (_request, reply) => reply.sendFile("index.html"));
  app.get("/app", async (_request, reply) => reply.sendFile("app.html"));
  app.get("/health", async () => ({ status: "ok" }));

  // Legacy demo
  app.register(demoRoutes);

  // API routes
  app.register(authRoutes);
  app.register(arenaRoutes);
  app.register(problemRoutes);
  app.register(matchRoutes);
  app.register(progressionRoutes);
  app.register(classRoutes);
  app.register(parentRoutes);
  app.register(rankingRoutes);
  app.register(roomRoutes);
  app.register(friendsRoutes);
  app.register(chatRoutes);
  app.register(gameRequestRoutes);

  // WebSocket handler
  registerWebSocket(app);

  return app;
};
