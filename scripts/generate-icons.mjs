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

// Monograma AW LEGALTECH — fundo preto, roxo sólido
// Estrutura: A (dois diagonais espessos em /\) + W (três barras verticais conectadas)
// As formas são polígonos preenchidos (não traços) — estilo do logo original
const SVG = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0a0a0f"/>
  <g fill="#7c3aed">

    <!-- LETRA A — perna esquerda (diagonal /) -->
    <!-- base: x 60→108, topo: x 165→208, apex em y=128 -->
    <polygon points="60,390 108,390 208,128 165,128"/>

    <!-- LETRA A — perna direita (diagonal \) = também a barra esquerda do W -->
    <polygon points="165,128 208,128 305,390 258,390"/>

    <!-- LETRA W — conector horizontal no topo das três barras (y=242 a y=284) -->
    <!-- começa onde a perna direita do A chega em y=242 (~x=262) até o fim do W -->
    <polygon points="262,242 463,242 463,284 262,284"/>

    <!-- LETRA W — barra central -->
    <polygon points="338,242 383,242 383,390 338,390"/>

    <!-- LETRA W — barra direita -->
    <polygon points="418,242 463,242 463,390 418,390"/>

  </g>
</svg>`;

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 512px; height: 512px; overflow: hidden; background: #0a0a0f; }
  </style>
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
      html.replace(
        'viewBox="0 0 512 512"',
        `viewBox="0 0 512 512" width="${size}" height="${size}"`
      ),
      { waitUntil: "networkidle" }
    );

    const buffer = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: size, height: size },
    });
    writeFileSync(path.join(publicDir, name), buffer);
    console.log(`✅ ${name} (${size}×${size})`);
  }

  await browser.close();
  console.log("Ícones gerados em public/");
}

generate().catch((e) => { console.error(e); process.exit(1); });
