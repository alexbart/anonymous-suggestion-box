#!/usr/bin/env node
/**
 * Cross-platform wrapper around `prisma <cmd>` for the root-level
 * `prisma/schema.prisma` setup used in this monorepo.
 *
 * Why this exists:
 * The Prisma CLI resolves its generator dependencies (`prisma` and
 * `@prisma/client`) relative to the *schema file's* directory. Because
 * `prisma/schema.prisma` lives at the repo root and has no `node_modules`
 * of its own, the CLI will try to auto-install Prisma into the repo root
 * via pnpm, which fails on pnpm >= 10 with `ERR_PNPM_ADDING_TO_ROOT` and
 * can also crash pnpm on Windows.
 *
 * This script bridges the schema directory to the API workspace's
 * `node_modules` via a directory junction, then forwards all arguments
 * to the locally installed Prisma binary.
 */

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const schemaDir = join(repoRoot, "prisma");
const apiNodeModules = join(repoRoot, "apps", "api", "node_modules");
const prismaNodeModules = join(schemaDir, "node_modules");

function ensureJunction() {
  if (existsSync(prismaNodeModules)) {
    try {
      const stat = lstatSync(prismaNodeModules);
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        return; // existing junction
      }
    } catch {
      // ignore
    }
    rmSync(prismaNodeModules, { recursive: true, force: true });
  }
  if (!existsSync(apiNodeModules)) {
    throw new Error(
      `Could not find node_modules at ${apiNodeModules}. Run 'pnpm install' first.`,
    );
  }
  if (process.platform === "win32") {
    execFileSync("cmd", ["/c", "mklink", "/J", prismaNodeModules, apiNodeModules], {
      stdio: "inherit",
    });
  } else {
    mkdirSync(dirname(prismaNodeModules), { recursive: true });
    symlinkSync(apiNodeModules, prismaNodeModules, "junction");
  }
}

function resolvePrismaBin() {
  const direct = join(
    apiNodeModules,
    ".bin",
    process.platform === "win32" ? "prisma.CMD" : "prisma",
  );
  if (existsSync(direct)) return direct;
  const fromPnpm = join(
    repoRoot,
    "node_modules",
    ".pnpm",
    "prisma@5.22.0",
    "node_modules",
    "prisma",
    "build",
    "index.js",
  );
  if (existsSync(fromPnpm)) return process.execPath;
}

ensureJunction();

const prismaBin = resolvePrismaBin();
if (!prismaBin) {
  throw new Error("Could not locate the Prisma binary. Run 'pnpm install' first.");
}

const args = process.argv.slice(2);
const env = {
  ...process.env,
  PRISMA_SKIP_POSTINSTALL_GENERATE: "1",
  PRISMA_GENERATE_SKIP_AUTOINSTALL: "1",
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/suggestion_box?schema=public",
};

if (prismaBin.endsWith(".CMD") || prismaBin.endsWith(".cmd")) {
  // Use shell:true only for proper quoting of paths with spaces
  execFileSync(`"${prismaBin}"`, args, { stdio: "inherit", env, cwd: schemaDir, shell: true });
} else if (prismaBin === process.execPath) {
  execFileSync(
    prismaBin,
    [join(repoRoot, "node_modules", ".pnpm", "prisma@5.22.0", "node_modules", "prisma", "build", "index.js"), ...args],
    { stdio: "inherit", env, cwd: schemaDir },
  );
} else {
  execFileSync(prismaBin, args, { stdio: "inherit", env, cwd: schemaDir });
}
