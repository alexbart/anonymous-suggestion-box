import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAdminToken } from "../utils/admin-auth.js";

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const token = request.cookies.admin_token;

  if (!token) {
    return reply.code(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  try {
    const payload = verifyAdminToken(token);

    if (payload.type !== "admin" || !payload.sub) {
      throw new Error("Invalid token");
    }

    request.admin = {
      id: payload.sub,
      email: payload.email,
    };
  } catch {
    return reply.code(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }
}
