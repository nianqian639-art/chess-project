import { FastifyPluginAsync } from "fastify";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { z } from "zod";
import { authGuard } from "../middleware/auth.js";
import { synth, TTS_DIR } from "../services/tts.js";

const synthBody = z.object({
  text: z.string().min(1).max(2000),
  preset: z.string().min(1).max(32).default("story"),
  language: z.enum(["zh", "en", "ja", "fr", "es"]).optional().default("zh"),
});

export const ttsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/tts", { preHandler: [authGuard] }, async (request) => {
    const body = synthBody.parse(request.body);
    const result = await synth(body.text, body.preset, body.language);
    return { url: result?.url ?? null };
  });

  // 公开读取：<audio src> 不会携带 Authorization header。
  // key 是 sha256（不可枚举），内容为通用讲解，公开可接受。
  app.get("/tts/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    if (!/^[a-f0-9]{64}\.mp3$/.test(key)) {
      return reply.code(404).send({ message: "音频不存在" });
    }
    try {
      const buffer = await readFile(resolve(TTS_DIR, key));
      return reply.type("audio/mpeg").send(buffer);
    } catch {
      return reply.code(404).send({ message: "音频不存在" });
    }
  });
};
