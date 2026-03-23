/**
 * Gera os ícones PNG do PWA usando Playwright.
 * Roda uma vez: node scripts/generate-icons.mjs
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

// Monograma AW LEGALTECH — polyline único /\/\/
//
// Um único traço contínuo com 6 pontos, todos os segmentos com ângulo idêntico.
// A perna direita do A é compartilhada com a perna esquerda do W.
//
// Passo horizontal: 85px | Altura total: 128→388 (260px)
// Ângulo de cada segmento: atan(260/85) ≈ 72° — igual em todos
//
//   44,388 → 129,128   = perna esquerda do A  (↗)
//  129,128 → 214,388   = perna direita do A   (↘)  ← também perna esquerda do W
//  214,388 → 299,128   = 1ª interna do W      (↗)
//  299,128 → 384,388   = 2ª interna do W      (↘)
//  384,388 → 469,128   = perna direita do W   (↗)
//
// W lido sozinho (da perna esquerda compartilhada): ↘↗↘↗ = W correto ✓
// Margens visuais: ~22px esquerda, ~21px direita (stroke-width 44 ÷ 2)

const SVG = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0a0a0f"/>
  <polyline fill="none" stroke="#7c3aed" stroke-width="44"
            stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="20"
            points="44,388 129,128 214,388 299,128 384,388 469,128"/>
</svg>`;

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>* { margin:0; padding:0; } html,body { width:512px; height:512px; overflow:hidden; background:#0a0a0f; }</style>
</head>
<body>${SVG}</body>
</html>`;

const SIZES = [
  { size: 512, name: "icon-512.png" },
  { size: 192, name: "icon-192.png" },
  { size: 180, name: "apple-touch-icon.png" },
];

async function generate() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const { size, name } of SIZES) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      html.replace('viewBox="0 0 512 512"', `viewBox="0 0 512 512" width="${size}" height="${size}"`),
      { waitUntil: "networkidle" }
    );
    const buffer = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: size, height: size } });
    writeFileSync(path.join(publicDir, name), buffer);
    console.log(`✅ ${name} (${size}×${size})`);
  }

  await browser.close();
  console.log("Ícones gerados em public/");
}

generate().catch((e) => { console.error(e); process.exit(1); });
