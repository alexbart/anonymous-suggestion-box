import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAdmin } from "../middleware/admin-auth.js";

const statuses = [
  "NEW",
  "UNDER_REVIEW",
  "PENDING",
  "ACTIONED",
  "CLOSED",
] as const;

const categories = [
  "PATIENT_CARE",
  "STAFFING",
  "EQUIPMENT",
  "WORKPLACE_SAFETY",
  "STAFF_WELFARE",
  "MANAGEMENT",
  "COMMUNICATION",
  "OTHER",
] as const;

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const allowedTransitions: Record<string, string[]> = {
  NEW: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["PENDING", "ACTIONED"],
  PENDING: ["UNDER_REVIEW", "ACTIONED"],
  ACTIONED: ["CLOSED"],
  CLOSED: [],
};

export async function adminSuggestionRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/admin/dashboard/summary",
    { preHandler: requireAdmin },
    async (_request, reply) => {
      const counts = await Promise.all(
        statuses.map(async (status) => {
          const count = await prisma.suggestion.count({
            where: { status },
          });
          return [status, count] as const;
        }),
      );

      const statusCounts = Object.fromEntries(counts);
      const total = await prisma.suggestion.count();

      return reply.send({
        success: true,
        data: {
          total,
          new: statusCounts.NEW ?? 0,
          underReview: statusCounts.UNDER_REVIEW ?? 0,
          pending: statusCounts.PENDING ?? 0,
          actioned: statusCounts.ACTIONED ?? 0,
          closed: statusCounts.CLOSED ?? 0,
        },
      });
    },
  );

  app.get(
    "/admin/suggestions",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const querySchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: z.enum(statuses).optional(),
        category: z.enum(categories).optional(),
        priority: z.enum(priorities).optional(),
        search: z.string().trim().max(100).optional(),
      });

      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
          },
        });
      }

      const { page, limit, status, category, priority, search } =
        parsed.data;

      const where = {
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
        ...(priority ? { priority } : {}),
        ...(search
          ? {
              OR: [
                {
                  referenceCode: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  message: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        prisma.suggestion.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            referenceCode: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                attachments: true,
                notes: true,
              },
            },
          },
        }),
        prisma.suggestion.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    },
  );

  app.get(
    "/admin/suggestions/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().regex(/^c[a-z0-9]{24,}$/i, "Invalid CUID format"),
      });

      const parsed = paramsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid suggestion ID",
          },
        });
      }

      const suggestion = await prisma.suggestion.findUnique({
        where: { id: parsed.data.id },
        select: {
          id: true,
          referenceCode: true,
          category: true,
          priority: true,
          message: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          attachments: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          notes: {
            select: {
              id: true,
              note: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!suggestion) {
        return reply.code(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Suggestion not found",
          },
        });
      }

      return reply.send({ success: true, data: suggestion });
    },
  );

  app.patch(
    "/admin/suggestions/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().regex(/^c[a-z0-9]{24,}$/i, "Invalid CUID format"),
      });
      const bodySchema = z.object({
        status: z.enum(statuses),
      });

      const parsedParams = paramsSchema.safeParse(request.params);
      const parsedBody = bodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid suggestion update",
          },
        });
      }

      const suggestion = await prisma.suggestion.findUnique({
        where: { id: parsedParams.data.id },
        select: {
          id: true,
          referenceCode: true,
          status: true,
        },
      });

      if (!suggestion) {
        return reply.code(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Suggestion not found",
          },
        });
      }

      const newStatus = parsedBody.data.status;

      if (suggestion.status === newStatus) {
        return reply.send({ success: true, data: suggestion });
      }

      const allowed =
        allowedTransitions[suggestion.status]?.includes(newStatus) ?? false;

      if (!allowed) {
        return reply.code(409).send({
          success: false,
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: `Cannot change status from ${suggestion.status} to ${newStatus}`,
          },
        });
      }

      const updated = await prisma.suggestion.update({
        where: { id: suggestion.id },
        data: { status: newStatus },
        select: {
          id: true,
          referenceCode: true,
          status: true,
          updatedAt: true,
        },
      });

      return reply.send({ success: true, data: updated });
    },
  );

  app.post(
    "/admin/suggestions/:id/notes",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().regex(/^c[a-z0-9]{24,}$/i, "Invalid CUID format"),
      });
      const bodySchema = z.object({
        note: z.string().trim().min(1).max(5000),
      });

      const parsedParams = paramsSchema.safeParse(request.params);
      const parsedBody = bodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid note",
          },
        });
      }

      const suggestion = await prisma.suggestion.findUnique({
        where: { id: parsedParams.data.id },
        select: { id: true },
      });

      if (!suggestion) {
        return reply.code(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Suggestion not found",
          },
        });
      }

      const note = await prisma.suggestionNote.create({
        data: {
          suggestionId: suggestion.id,
          note: parsedBody.data.note,
        },
        select: {
          id: true,
          note: true,
          createdAt: true,
        },
      });

      return reply.code(201).send({ success: true, data: note });
    },
  );
}
