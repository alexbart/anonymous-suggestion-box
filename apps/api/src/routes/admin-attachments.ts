import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAdmin } from "../middleware/admin-auth.js";
import { storage } from "../utils/file-storage.js";

export async function adminAttachmentRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/admin/suggestions/:id/attachments/:attachmentId",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().regex(/^c[a-z0-9]{24,}$/i, "Invalid CUID format"),
        attachmentId: z.string().regex(/^c[a-z0-9]{24,}$/i, "Invalid CUID format"),
      });

      const parsed = paramsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid attachment ID",
          },
        });
      }

      const { id, attachmentId } = parsed.data;

      const attachment = await prisma.attachment.findFirst({
        where: {
          id: attachmentId,
          suggestionId: id,
        },
      });

      if (!attachment) {
        return reply.code(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      const exists = await storage.exists(attachment.storedName);
      if (!exists) {
        return reply.code(404).send({
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "Attachment file not found",
          },
        });
      }

      const stream = await storage.read(attachment.storedName);
      if (!stream) {
        return reply.code(404).send({
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "Attachment file not found",
          },
        });
      }

      reply.header("Content-Type", attachment.mimeType);
      reply.header(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
      );

      return reply.send(stream);
    },
  );
}
