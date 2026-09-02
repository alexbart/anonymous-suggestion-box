import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { registerSuggestionRoutes } from "./routes/suggestions.js";

const PORT = Number(process.env.API_PORT ?? 3001);
const HOST = process.env.API_HOST ?? "0.0.0.0";

async function buildServer() {
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

  await app.register(rateLimit, {
    global: false,
  });

  app.get("/health", async () => ({
    success: true,
    data: { status: "ok", service: "api", timestamp: new Date().toISOString() },
  }));

  await registerSuggestionRoutes(app, {
    submitRateLimit: {
      max: 10,
      timeWindow: "15 minutes",
    },
  });

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
