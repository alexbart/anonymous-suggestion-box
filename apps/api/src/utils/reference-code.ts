import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 10;

function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

/**
 * Generate a human-friendly reference code such as `SB-82F7K3`.
 * Uses uppercase alphanumeric characters but excludes visually
 * ambiguous glyphs (0/O, 1/I/L) to reduce transcription errors.
 */
export function generateReferenceCode(): string {
  return `SB-${randomCode(CODE_LENGTH)}`;
}

export async function generateUniqueReferenceCode(
  exists: (code: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateReferenceCode();
    if (!(await exists(code))) {
      return code;
    }
  }
  throw new Error("Failed to generate a unique reference code");
}
