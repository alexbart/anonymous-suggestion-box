import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export const ALLOWED_FILE_TYPES = new Map<string, string>([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".pdf", "application/pdf"],
  [
    ".docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
]);

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
export const MAX_FILES = 5;

/**
 * Storage abstraction. Two implementations:
 *  - LocalFileStorage: persists to `apps/api/uploads/`. Used in
 *    development and any environment with a real filesystem.
 *  - MemoryFileStorage: keeps buffers in process memory. Used on
 *    serverless hosts (Vercel Functions) where the local disk is
 *    ephemeral. Good for demo, NOT for production at scale.
 *
 * Both implement the same `StorageProvider` interface so route
 * code never branches on the storage backend.
 */
export interface StorageProvider {
  ensure(): Promise<void>;
  put(storedFilename: string, stream: NodeJS.ReadableStream): Promise<void>;
  read(storedFilename: string): Promise<NodeJS.ReadableStream | null>;
  delete(storedFilename: string): Promise<void>;
  exists(storedFilename: string): Promise<boolean>;
}

class LocalFileStorage implements StorageProvider {
  private readonly dir = UPLOAD_DIR;

  async ensure(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async put(storedFilename: string, stream: NodeJS.ReadableStream): Promise<void> {
    const { createWriteStream } = await import("node:fs");
    await this.pipe(stream, createWriteStream(path.join(this.dir, storedFilename)));
  }

  async read(storedFilename: string): Promise<NodeJS.ReadableStream | null> {
    const { createReadStream } = await import("node:fs");
    const filePath = path.join(this.dir, storedFilename);
    try {
      await unlink(filePath).catch(() => {
        /* not present */
      });
      // confirm existence via stat then open
      const { stat } = await import("node:fs/promises");
      await stat(filePath);
      return createReadStream(filePath);
    } catch {
      return null;
    }
  }

  async delete(storedFilename: string): Promise<void> {
    try {
      await unlink(path.join(this.dir, storedFilename));
    } catch {
      // already gone
    }
  }

  async exists(storedFilename: string): Promise<boolean> {
    const { stat } = await import("node:fs/promises");
    try {
      await stat(path.join(this.dir, storedFilename));
      return true;
    } catch {
      return false;
    }
  }

  private async pipe(
    source: NodeJS.ReadableStream,
    destination: NodeJS.WritableStream,
  ): Promise<void> {
    const { pipeline } = await import("node:stream/promises");
    await pipeline(source, destination);
  }
}

class MemoryFileStorage implements StorageProvider {
  private readonly store = new Map<string, Buffer>();

  async ensure(): Promise<void> {
    /* no-op */
  }

  async put(storedFilename: string, stream: NodeJS.ReadableStream): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    this.store.set(storedFilename, Buffer.concat(chunks));
  }

  async read(storedFilename: string): Promise<NodeJS.ReadableStream | null> {
    const buf = this.store.get(storedFilename);
    if (!buf) return null;
    const { Readable } = await import("node:stream");
    return Readable.from(buf);
  }

  async delete(storedFilename: string): Promise<void> {
    this.store.delete(storedFilename);
  }

  async exists(storedFilename: string): Promise<boolean> {
    return this.store.has(storedFilename);
  }
}

function selectStorage(): StorageProvider {
  // Heuristic: on Vercel / Lambda / any other serverless platform
  // the local disk is read-only or ephemeral, so use memory.
  // The FORCE_FILE_STORAGE=local|memory env var overrides this.
  const forced = process.env.FILE_STORAGE?.toLowerCase();
  if (forced === "memory") return new MemoryFileStorage();
  if (forced === "local") return new LocalFileStorage();

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return new MemoryFileStorage();
  }
  return new LocalFileStorage();
}

export const storage: StorageProvider = selectStorage();

export function getExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function validateFileType(
  filename: string,
  mimetype: string,
): boolean {
  const extension = getExtension(filename);
  const expectedMime = ALLOWED_FILE_TYPES.get(extension);

  if (!expectedMime || expectedMime !== mimetype) {
    return false;
  }

  return true;
}

export function generateStoredFilename(filename: string): string {
  const extension = getExtension(filename);
  return `${randomUUID()}${extension}`;
}

export function getStoredFilePath(storedFilename: string): string {
  return path.join(UPLOAD_DIR, storedFilename);
}

export async function deleteStoredFile(storedFilename: string): Promise<void> {
  await storage.delete(storedFilename);
}

export async function ensureUploadDirectory(): Promise<void> {
  await storage.ensure();
}
