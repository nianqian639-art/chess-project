import { buildServer } from "./server.js";
import { closeDatabase } from "./services/db.js";
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile?.(".env");
}

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";

const bootstrap = async () => {
  const server = buildServer();
  try {
    await server.listen({ port, host });
    server.log.info(`API server listening on ${host}:${port}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }

  // ── Graceful shutdown ──────────────────────────────────
  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await server.close();
      closeDatabase();
      server.log.info("Server closed successfully.");
      process.exit(0);
    } catch (err) {
      server.log.error(err, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGUSR2", () => shutdown("SIGUSR2"));
};

bootstrap();
