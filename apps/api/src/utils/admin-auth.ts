import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = "8h";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export interface AdminTokenPayload {
  sub: string;
  email: string;
  type: "admin";
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AdminTokenPayload;
}
