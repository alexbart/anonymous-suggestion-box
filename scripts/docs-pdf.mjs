#!/usr/bin/env node
/**
 * Convert the Markdown docs in `docs/` to PDF.
 *
 * Uses pandoc with a TeX engine if available. If pandoc or a
 * TeX engine is not on PATH, prints install instructions and
 * exits 0 (the Markdown sources remain the source of truth).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(repoRoot, "docs");
const outDir = path.join(docsDir, "pdf");

const docs = [
  { src: "nurse-user-guide.md", title: "Nurse User Guide" },
  { src: "admin-user-guide.md", title: "Admin User Guide" },
  { src: "technical-overview.md", title: "Technical Overview" },
];

function check(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const hasPandoc = check("pandoc", ["--version"]);
const hasXe = check("xelatex", ["--version"]);
const hasPdf = check("wkhtmltopdf", ["--version"]);

if (!hasPandoc) {
  console.error(
    "pandoc is not installed.\n" +
      "Install it from https://pandoc.org/installing.html\n" +
      "Then re-run: pnpm docs:pdf",
  );
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

for (const doc of docs) {
  const src = path.join(docsDir, doc.src);
  if (!existsSync(src)) {
    console.warn(`Skipping ${doc.src} (not found)`);
    continue;
  }
  const out = path.join(outDir, doc.src.replace(/\.md$/, ".pdf"));
  const args = [
    src,
    "-o",
    out,
    "--pdf-engine=xelatex",
    "-V",
    "geometry:margin=1in",
    "-V",
    "mainfont=DejaVu Sans",
    "-V",
    "monofont=DejaVu Sans Mono",
    "--toc",
    "--toc-depth=2",
    `-V`,
    `title=${doc.title}`,
  ];
  if (hasXe) {
    try {
      execFileSync("pandoc", args, { stdio: "inherit" });
      console.log(`Wrote ${path.relative(repoRoot, out)}`);
    } catch (err) {
      console.error(`Failed to build ${doc.src}: ${err.message}`);
    }
  } else {
    console.warn(
      `xelatex not found; cannot produce ${path.basename(out)}. ` +
        "Install a TeX distribution (e.g. TeX Live) and re-run.",
    );
  }
}
