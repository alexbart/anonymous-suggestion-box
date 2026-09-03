import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { verifyPassword } from "../utils/password.js";
import { signAdminToken } from "../utils/admin-auth.js";
import { requireAdmin } from "../middleware/admin-auth.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_NAME = "admin_token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

export async function adminAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/admin/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid login details",
          },
        });
      }

      const { email, password } = parsed.data;

      const admin = await prisma.adminUser.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!admin || !admin.isActive) {
        return reply.code(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      const validPassword = await verifyPassword(password, admin.passwordHash);

      if (!validPassword) {
        return reply.code(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      const token = signAdminToken({
        sub: admin.id,
        email: admin.email,
        type: "admin",
      });

      reply.setCookie(COOKIE_NAME, token, cookieOptions());

      return reply.send({
        success: true,
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
          },
        },
      });
    },
  );

  app.post("/admin/logout", async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return reply.send({ success: true });
  });

  app.get(
    "/admin/me",
    { preHandler: requireAdmin },
    async (request, reply) => {
      return reply.send({
        success: true,
        data: {
          admin: request.admin,
        },
      });
    },
  );
}
