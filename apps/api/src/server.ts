import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { buildApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env only when one is available. On Vercel / production
// containers the env vars are injected by the platform and we
// should not fail if there is no .env file on disk.
if (process.env.NODE_ENV !== "production") {
  config({ path: path.resolve(__dirname, "..", ".env"), quiet: true });
}

const PORT = Number(process.env.API_PORT ?? 3001);
const HOST = process.env.API_HOST ?? "0.0.0.0";

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
