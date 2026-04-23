#!/usr/bin/env node
/**
 * Sincroniza AW WRITER entre AW-ECO (este repo) e AWLEGALTECH/AW-WRITER.
 *
 * AW WRITER é um único arquivo HTML standalone.
 *
 * Uso:
 *   npm run sync:writer:pull   — traz index.html do AW-WRITER pra public/apps/writer/
 *   npm run sync:writer:push   — empurra public/apps/writer/index.html pra AW-WRITER
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const REPO = "https://github.com/AWLEGALTECH/AW-WRITER.git";
const LOCAL_FILE = "public/apps/writer/index.html";
const REMOTE_FILE = "index.html";
const direction = process.argv[2];

if (!["pull", "push"].includes(direction)) {
  console.error("Use: node scripts/sync/sync-writer.mjs pull|push");
  process.exit(1);
}

const tmpDir = path.join(os.tmpdir(), `aw-writer-sync-${Date.now()}`);
const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });

console.log(`\n▶ Sync AW WRITER (${direction})`);

try {
  run(`git clone --depth 20 ${REPO} "${tmpDir}"`);

  if (direction === "pull") {
    fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
    fs.copyFileSync(path.join(tmpDir, REMOTE_FILE), LOCAL_FILE);
    console.log(`\n✓ Pull concluído: ${LOCAL_FILE}`);
  } else {
    fs.copyFileSync(LOCAL_FILE, path.join(tmpDir, REMOTE_FILE));
    run(`git add -A`, { cwd: tmpDir });
    const msg = `sync: from AW-ECO (${new Date().toISOString()})`;
    try {
      run(`git commit -m "${msg}"`, { cwd: tmpDir });
      run(`git push origin main`, { cwd: tmpDir });
      console.log(`\n✓ Push concluído.`);
    } catch {
      console.log("\n⚠ Nada a commitar ou push falhou.");
    }
  }
} finally {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}
