import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../apps/api/src/utils/password";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", "apps", "api", ".env") });

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured");
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.adminUser.upsert({
    where: { email: email.toLowerCase() },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      isActive: true,
    },
  });

  console.log("Admin user ready:", admin);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
