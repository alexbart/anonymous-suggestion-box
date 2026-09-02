import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "../db.js";
import {
  ReferenceCodeParamSchema,
  SubmitSuggestionSchema,
} from "../validation/suggestion.js";
import { generateUniqueReferenceCode } from "../utils/reference-code.js";

interface SuggestionRoutesOptions extends FastifyPluginOptions {
  submitRateLimit?: { max: number; timeWindow: string };
}

export async function registerSuggestionRoutes(
  app: FastifyInstance,
  options: SuggestionRoutesOptions = {},
): Promise<void> {
  const submitLimit = options.submitRateLimit ?? { max: 10, timeWindow: "15 minutes" };

  app.post(
    "/api/v1/suggestions",
    {
      config: {
        rateLimit: submitLimit,
      },
      schema: {
        body: {
          type: "object",
          required: ["category", "message"],
          properties: {
            category: { type: "string" },
            message: { type: "string" },
            priority: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = SubmitSuggestionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid submission payload",
            details: parsed.error.flatten(),
          },
        });
      }

      const { category, message, priority } = parsed.data;

      const referenceCode = await generateUniqueReferenceCode(async (code) => {
        const existing = await prisma.suggestion.findUnique({
          where: { referenceCode: code },
          select: { id: true },
        });
        return existing !== null;
      });

      const suggestion = await prisma.suggestion.create({
        data: {
          referenceCode,
          category,
          message,
          priority: priority ?? "NORMAL",
          status: "NEW",
        },
        select: { referenceCode: true, status: true },
      });

      return reply.code(201).send({
        success: true,
        data: {
          referenceCode: suggestion.referenceCode,
          status: suggestion.status,
        },
      });
    },
  );

  app.get(
    "/api/v1/suggestions/:referenceCode",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const parsed = ReferenceCodeParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid reference code",
            details: parsed.error.flatten(),
          },
        });
      }

      const suggestion = await prisma.suggestion.findUnique({
        where: { referenceCode: parsed.data.referenceCode },
        select: { referenceCode: true, status: true },
      });

      if (!suggestion) {
        return reply.code(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "No suggestion found for that reference code",
          },
        });
      }

      return reply.send({
        success: true,
        data: {
          referenceCode: suggestion.referenceCode,
          status: suggestion.status,
        },
      });
    },
  );
}

export { rateLimit };
