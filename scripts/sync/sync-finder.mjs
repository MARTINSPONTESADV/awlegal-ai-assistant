#!/usr/bin/env node
/**
 * Sincroniza código do AW FINDER entre AW-ECO (este repo) e AWLEGALTECH/AW-FINDER.
 *
 * Uso:
 *   npm run sync:finder:pull   — traz mudanças do AW-FINDER standalone pra src/apps/finder/
 *   npm run sync:finder:push   — empurra mudanças locais pra AW-FINDER standalone
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const REPO = "https://github.com/AWLEGALTECH/AW-FINDER.git";
const LOCAL_PREFIX = "src/apps/finder";
const REMOTE_SRC_PREFIX = "src"; // dentro do AW-FINDER, os arquivos ficam em src/
const direction = process.argv[2]; // "pull" ou "push"

if (!["pull", "push"].includes(direction)) {
  console.error("Use: node scripts/sync/sync-finder.mjs pull|push");
  process.exit(1);
}

const tmpDir = path.join(os.tmpdir(), `aw-finder-sync-${Date.now()}`);
const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });

console.log(`\n▶ Sync AW FINDER (${direction})`);
console.log(`  local:  ${LOCAL_PREFIX}/`);
console.log(`  remote: ${REPO} (${REMOTE_SRC_PREFIX}/)`);

try {
  console.log(`\n▶ Clonando ${REPO} em ${tmpDir}…`);
  run(`git clone --depth 20 ${REPO} "${tmpDir}"`);

  if (direction === "pull") {
    console.log(`\n▶ Copiando ${tmpDir}/${REMOTE_SRC_PREFIX}/ → ${LOCAL_PREFIX}/`);
    fs.rmSync(LOCAL_PREFIX, { recursive: true, force: true });
    fs.cpSync(path.join(tmpDir, REMOTE_SRC_PREFIX), LOCAL_PREFIX, { recursive: true });
    console.log(`\n✓ Pull concluído. Revise com 'git diff ${LOCAL_PREFIX}/' e commite se OK.`);
  } else {
    // push
    console.log(`\n▶ Copiando ${LOCAL_PREFIX}/ → ${tmpDir}/${REMOTE_SRC_PREFIX}/`);
    fs.rmSync(path.join(tmpDir, REMOTE_SRC_PREFIX), { recursive: true, force: true });
    fs.cpSync(LOCAL_PREFIX, path.join(tmpDir, REMOTE_SRC_PREFIX), { recursive: true });
    console.log(`\n▶ Commitando + push no ${REPO}…`);
    run(`git add -A`, { cwd: tmpDir });
    const msg = `sync: from AW-ECO (${new Date().toISOString()})`;
    try {
      run(`git commit -m "${msg}"`, { cwd: tmpDir });
      run(`git push origin main`, { cwd: tmpDir });
      console.log(`\n✓ Push concluído. Deploy Vercel do AW-FINDER atualizará automaticamente.`);
    } catch (e) {
      console.log("\n⚠ Nada a commitar (sem diferenças) ou push falhou — confira mensagens acima.");
    }
  }
} finally {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}
