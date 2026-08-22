import { FastifyPluginAsync } from "fastify";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "../services/db.js";

const SESSION_EXPIRY_DAYS = 7;

const normalizePhone = (value: string): string => {
  const compact = value.trim().replace(/[\s\-().]/g, "");
  if (/^\+\d{8,15}$/.test(compact)) {
    return compact;
  }
  if (/^1\d{10}$/.test(compact)) {
    return `+86${compact}`;
  }
  throw new Error("手机号格式不正确，请输入 13800138000 或 +12232323344 这类号码");
};

const sendCodeSchema = z.object({
  phone: z.string().transform(normalizePhone)
});

const loginSchema = z.object({
  phone: z.string().transform(normalizePhone),
  password: z.string().min(8, "密码至少8位").max(72, "密码太长"),
});

const registerSchema = z.object({
  phone: z.string().transform(normalizePhone),
  password: z.string().min(8, "密码至少8位").max(72, "密码太长"),
  role: z.enum(["student", "parent", "teacher"]),
  displayName: z.string().min(1, "昵称不能为空").max(24, "昵称最多24个字")
});

const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password: string, storedHash: string | null | undefined): boolean => {
  if (!storedHash) {
    return false;
  }
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const createSession = (userId: string) => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt,
  });
  return token;
};

const publicUser = <T extends { passwordHash?: string | null }>(user: T): Omit<T, "passwordHash"> => {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

const findUserByPhone = (phone: string) => {
  return db.users.find((user) => {
    if (user.phone === phone) {
      return true;
    }
    try {
      return normalizePhone(user.phone) === phone;
    } catch {
      return false;
    }
  });
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  // ── Send SMS verification code ───────────────────────
  app.post("/auth/send-code", async (request, reply) => {
    let body: z.infer<typeof sendCodeSchema>;
    try {
      body = sendCodeSchema.parse(request.body);
    } catch (error) {
      return app.httpErrors.badRequest(error instanceof Error ? error.message : "手机号格式不正确");
    }
    const code = process.env.DEMO_LOGIN_CODE;
    if (!code) {
      return reply.code(500).send({ message: "短信服务未配置" });
    }
    db.smsCodeMap.set(body.phone, code);
    return {
      success: true,
      ...(process.env.NODE_ENV !== "production" || process.env.EXPOSE_DEMO_CODE === "true" ? { demoCode: code } : {}),
      message: "验证码已发送"
    };
  });

  // ── Register ─────────────────────────────────────────
  app.post("/auth/register", async (request, reply) => {
    let body: z.infer<typeof registerSchema>;
    try {
      body = registerSchema.parse(request.body);
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : "注册信息格式不正确" });
    }
    const existing = findUserByPhone(body.phone);
    if (existing) {
      return reply.code(409).send({ message: "手机号已注册，请直接登录" });
    }

    const user = {
      id: crypto.randomUUID(),
      phone: body.phone,
      passwordHash: hashPassword(body.password),
      displayName: body.displayName,
      role: body.role,
      childIds: [] as string[],
      classIds: [] as string[],
      points: 0,
      level: 1,
      streakDays: 1,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);

    return {
      token: createSession(user.id),
      user: publicUser(user)
    };
  });

  // ── Login ────────────────────────────────────────────
  app.post("/auth/login", async (request, reply) => {
    let body: z.infer<typeof loginSchema>;
    try {
      body = loginSchema.parse(request.body);
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : "登录信息格式不正确" });
    }

    const user = findUserByPhone(body.phone);
    if (!user) {
      return reply.code(404).send({ message: "账号不存在，请先注册" });
    }

    if (!user.passwordHash) {
      return reply.code(400).send({ message: "账号未设置密码，请使用验证码登录" });
    }

    if (!verifyPassword(body.password, user.passwordHash)) {
      return reply.code(400).send({ message: "手机号或密码不正确" });
    }

    return {
      token: createSession(user.id),
      user: publicUser(user)
    };
  });

  // ── Login with verification code ──────────────────────
  const loginWithCodeSchema = z.object({
    phone: z.string().transform(normalizePhone),
    code: z.string().min(1, "请输入验证码"),
    role: z.enum(["student", "parent", "teacher"]).optional(),
    displayName: z.string().min(1).max(24).optional(),
  });

  app.post("/auth/login-with-code", async (request, reply) => {
    let body: z.infer<typeof loginWithCodeSchema>;
    try {
      body = loginWithCodeSchema.parse(request.body);
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : "请求格式不正确" });
    }

    const savedCode = db.smsCodeMap.get(body.phone);
    if (!savedCode || savedCode !== body.code) {
      return reply.code(400).send({ message: "验证码不正确或已过期" });
    }

    // Code is correct — find or create user
    let user = findUserByPhone(body.phone);
    if (!user) {
      // Auto-register for code-based login
      if (!body.role || !body.displayName) {
        return reply.code(400).send({ message: "新用户请提供昵称和角色" });
      }
      user = {
        id: crypto.randomUUID(),
        phone: body.phone,
        passwordHash: null, // no password set for code-login users
        displayName: body.displayName,
        role: body.role,
        childIds: [] as string[],
        classIds: [] as string[],
        points: 0,
        level: 1,
        streakDays: 1,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
    }

    return {
      token: createSession(user.id),
      user: publicUser(user),
    };
  });

  // ── Logout ───────────────────────────────────────────
  app.post("/auth/logout", async (request, _reply) => {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const token = header.replace("Bearer ", "").trim();
      const idx = db.sessions.findIndex((s) => s.token === token);
      if (idx >= 0) {
        db.sessions.splice(idx, 1);
      }
    }
    return { success: true };
  });
};
