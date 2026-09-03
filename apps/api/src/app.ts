import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import cookie from "@fastify/cookie";
import { registerSuggestionRoutes } from "./routes/suggestions.js";
import { adminAuthRoutes } from "./routes/admin-auth.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
    trustProxy: true,
  });

  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    global: false,
  });

  await app.register(multipart, {
    limits: {
      files: 5,
      fileSize: 10 * 1024 * 1024,
      parts: 15,
    },
  });

  app.get("/health", async () => ({
    success: true,
    data: { status: "ok", service: "api", timestamp: new Date().toISOString() },
  }));

  app.register(
    async (instance) => {
      await registerSuggestionRoutes(instance, {
        submitRateLimit: { max: 10, timeWindow: "15 minutes" },
      });
      await adminAuthRoutes(instance);
    },
    { prefix: "/api/v1" },
  );

  return app;
}
