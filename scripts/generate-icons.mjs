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

// Monograma AW LEGALTECH — reconstrução fiel ao logo original
//
// Estrutura:
//   A: polyline 71,388 → 156,128 → 241,388 (dois diagonais em /\)
//   W: três barras PARALELAS ao diagonal direito do A, conectadas por barra horizontal no topo
//      - A barra esquerda do W coincide com a barra direita do A
//      - Conector horizontal em y=244 (45% do A, nível onde o W começa)
//      - Barra central: (294,244) → (341,388) [mesmo ângulo do A]
//      - Barra direita: (394,244) → (441,388) [mesmo ângulo do A]
//   Espaçamento: 100px entre centros de barra (uniforme)

const SVG = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0a0a0f"/>
  <g fill="none" stroke="#7c3aed" stroke-width="48"
     stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="20">

    <!-- LETRA A: dois diagonais formando /\  -->
    <polyline points="71,388 156,128 241,388"/>

    <!-- LETRA W: conector horizontal no topo (y=244), ligando A ao W -->
    <line x1="194" y1="244" x2="394" y2="244"/>

    <!-- LETRA W: barra central — paralela à perna direita do A -->
    <line x1="294" y1="244" x2="341" y2="388"/>

    <!-- LETRA W: barra direita — paralela à perna direita do A -->
    <line x1="394" y1="244" x2="441" y2="388"/>

  </g>
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
