import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { prisma } from "../db.js";
import { SubmitSuggestionSchema, ReferenceCodeParamSchema } from "../validation/suggestion.js";
import { generateUniqueReferenceCode } from "../utils/reference-code.js";
import {
  deleteStoredFile,
  ensureUploadDirectory,
  generateStoredFilename,
  getStoredFilePath,
  validateFileType,
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
} from "../utils/file-storage.js";

interface SuggestionRoutesOptions extends FastifyPluginOptions {
  submitRateLimit?: { max: number; timeWindow: string };
}

interface UploadedFile {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  storagePath: string;
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
    },
    async (request, reply) => {
      await ensureUploadDirectory();

      const fields: Record<string, string> = {};
      const uploadedFiles: UploadedFile[] = [];
      let totalSize = 0;

      try {
        const parts = request.parts();

        for await (const part of parts) {
          if (part.type === "field") {
            fields[part.fieldname] = String(part.value);
            continue;
          }

          if (part.type !== "file") {
            continue;
          }

          if (!part.filename) {
            continue;
          }

          if (uploadedFiles.length >= MAX_FILES) {
            throw new Error("Maximum of 5 files allowed");
          }

          if (!validateFileType(part.filename, part.mimetype)) {
            throw new Error(`Unsupported file type: ${part.filename}`);
          }

          const storedName = generateStoredFilename(part.filename);
          const storagePath = getStoredFilePath(storedName);

          await pipeline(part.file, createWriteStream(storagePath));

          const size = part.file.bytesRead;

          if (size > MAX_FILE_SIZE || part.file.truncated) {
            await deleteStoredFile(storedName);
            throw new Error(
              `File exceeds the maximum size of 10 MB: ${part.filename}`,
            );
          }

          totalSize += size;

          if (totalSize > MAX_TOTAL_SIZE) {
            await deleteStoredFile(storedName);
            throw new Error("Total attachment size cannot exceed 25 MB");
          }

          uploadedFiles.push({
            originalName: part.filename,
            storedName,
            mimeType: part.mimetype,
            size,
            storagePath,
          });
        }

        const parsed = SubmitSuggestionSchema.safeParse({
          category: fields.category,
          priority: fields.priority,
          message: fields.message,
        });

        if (!parsed.success) {
          for (const file of uploadedFiles) {
            await deleteStoredFile(file.storedName);
          }
          return reply.code(400).send({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid suggestion data",
              details: parsed.error.flatten(),
            },
          });
        }

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
            category: parsed.data.category,
            message: parsed.data.message,
            priority: parsed.data.priority ?? "NORMAL",
            status: "NEW",
            attachments: {
              create: uploadedFiles.map((file) => ({
                originalName: file.originalName,
                storedName: file.storedName,
                mimeType: file.mimeType,
                size: file.size,
                storagePath: file.storagePath,
              })),
            },
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
      } catch (error) {
        for (const file of uploadedFiles) {
          await deleteStoredFile(file.storedName);
        }
        request.log.error(error);
        const message =
          error instanceof Error ? error.message : "Unable to process submission";
        return reply.code(400).send({
          success: false,
          error: {
            code: "UPLOAD_ERROR",
            message,
          },
        });
      }
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
