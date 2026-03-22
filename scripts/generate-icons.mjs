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

// Logo AW LEGALTECH — fundo preto, letras roxas geométricas (estilo monograma)
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 512px; height: 512px; background: transparent; overflow: hidden; }
  </style>
</head>
<body>
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <!-- Fundo preto -->
    <rect width="512" height="512" fill="#0a0a0f"/>

    <!-- Monograma AW — traços roxos geométricos -->
    <g stroke="#8b5cf6" stroke-width="36" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="20" fill="none">

      <!-- Letra A: vértice em (150,70), base de (52,442) a (248,442) -->
      <polyline points="52,442 150,70 248,442"/>
      <!-- Barra do A no ponto 38% da altura -->
      <line x1="90" y1="299" x2="210" y2="299"/>

      <!-- Letra W: de (270,70) até (460,70) com os dois vales em baixo -->
      <polyline points="270,70 300,442 365,238 430,442 460,70"/>

    </g>

    <!-- Linha decorativa fina embaixo — sutil toque high-tech -->
    <line x1="52" y1="462" x2="460" y2="462" stroke="#8b5cf6" stroke-width="3" stroke-linecap="square" opacity="0.45"/>
  </svg>
</body>
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
      html.replace('width="512" height="512"', `width="${size}" height="${size}"`),
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
