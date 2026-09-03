import "fastify";
import "@fastify/cookie";

declare module "fastify" {
  interface FastifyRequest {
    admin?: {
      id: string;
      email: string;
    };
  }
}
