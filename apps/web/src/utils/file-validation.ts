const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateFiles(files: File[]): string | null {
  if (files.length > MAX_FILES) {
    return "You can attach a maximum of 5 files.";
  }

  let totalSize = 0;

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return `${file.name} is not a supported file type.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is larger than the 10 MB limit.`;
    }

    totalSize += file.size;
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    return "The total size of your attachments cannot exceed 25 MB.";
  }

  return null;
}
