#!/usr/bin/env node
/**
 * Sincroniza código base entre AW-ECO (este repo) e AWLEGALTECH/AWSYSTEM.
 *
 * AW-SYSTEM é um SUBSET do AW-ECO — contém todas as páginas/components
 * EXCETO os específicos do ecossistema (HomeHub, PreProtocolo, apps/*).
 *
 * Uso:
 *   npm run sync:system:pull   — traz mudanças do AWSYSTEM (base code) pra cá
 *   npm run sync:system:push   — empurra mudanças de base pra AWSYSTEM
 *
 * Arquivos NÃO sincronizados (ecosystem-only, existem só no AW-ECO):
 *   - src/pages/HomeHub.tsx
 *   - src/pages/PreProtocolo.tsx
 *   - src/pages/apps/
 *   - src/apps/finder/
 *   - public/apps/
 *   - public/tesseract/
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const REPO = "https://github.com/AWLEGALTECH/AWSYSTEM.git";
const direction = process.argv[2];

if (!["pull", "push"].includes(direction)) {
  console.error("Use: node scripts/sync/sync-system.mjs pull|push");
  process.exit(1);
}

// Diretórios/arquivos que NÃO existem no AW-SYSTEM (só no AW-ECO)
const ECOSYSTEM_ONLY = [
  "src/pages/HomeHub.tsx",
  "src/pages/PreProtocolo.tsx",
  "src/pages/apps",
  "src/apps",
  "public/apps",
  "public/tesseract",
];

// Áreas que são "base code" — copiar bidireccionalmente
const SHARED_PATHS = [
  "src/components",
  "src/hooks",
  "src/integrations",
  "src/lib",
  "src/pages",
  "supabase/migrations",
  "supabase/functions",
];

const tmpDir = path.join(os.tmpdir(), `aw-system-sync-${Date.now()}`);
const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });

function copyDirFiltered(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  const entries = fs.readdirSync(from, { withFileTypes: true });
  for (const entry of entries) {
    const fromP = path.join(from, entry.name);
    const toP = path.join(to, entry.name);
    const rel = path.relative(".", fromP).replace(/\\/g, "/");
    if (ECOSYSTEM_ONLY.some(eco => rel.includes(eco))) continue;
    if (entry.isDirectory()) copyDirFiltered(fromP, toP);
    else fs.copyFileSync(fromP, toP);
  }
}

console.log(`\n▶ Sync AW-SYSTEM (${direction})`);
console.log(`  Arquivos ecosystem-only serão ignorados:`);
ECOSYSTEM_ONLY.forEach(p => console.log(`    - ${p}`));

try {
  run(`git clone --depth 20 ${REPO} "${tmpDir}"`);

  if (direction === "pull") {
    for (const p of SHARED_PATHS) {
      const src = path.join(tmpDir, p);
      if (!fs.existsSync(src)) continue;
      console.log(`\n▶ Pull ${p}/`);
      copyDirFiltered(src, p);
    }
    console.log(`\n✓ Pull concluído. Revise com 'git diff' e commite se OK.`);
  } else {
    for (const p of SHARED_PATHS) {
      if (!fs.existsSync(p)) continue;
      console.log(`\n▶ Push ${p}/`);
      copyDirFiltered(p, path.join(tmpDir, p));
    }
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
