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

export async function ensureUploadDirectory(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

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
  try {
    await unlink(getStoredFilePath(storedFilename));
  } catch {
    // File may already have been removed.
  }
}
