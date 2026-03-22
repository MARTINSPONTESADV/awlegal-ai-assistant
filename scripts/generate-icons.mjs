/**
 * Gera os ícones PNG do PWA usando Playwright (já instalado no projeto).
 * Roda uma vez: node scripts/generate-icons.mjs
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 512px; height: 512px; background: transparent; overflow: hidden; }
    .icon {
      width: 512px;
      height: 512px;
      background: #7c3aed;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-weight: 900;
      font-size: 190px;
      color: white;
      letter-spacing: -8px;
      user-select: none;
    }
  </style>
</head>
<body>
  <div class="icon">AW</div>
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

  await page.setContent(html, { waitUntil: "networkidle" });

  for (const { size, name } of SIZES) {
    await page.setViewportSize({ width: 512, height: 512 });

    const element = await page.$(".icon");
    const buffer = await element.screenshot({ type: "png" });

    if (size < 512) {
      // Re-render at target size for pixel-perfect result
      await page.setViewportSize({ width: size, height: size });
      await page.evaluate((s) => {
        const icon = document.querySelector(".icon");
        icon.style.width = s + "px";
        icon.style.height = s + "px";
        icon.style.fontSize = Math.round(s * 0.37) + "px";
        icon.style.letterSpacing = Math.round(s * -0.016) + "px";
        document.body.style.width = s + "px";
        document.body.style.height = s + "px";
        document.documentElement.style.width = s + "px";
        document.documentElement.style.height = s + "px";
      }, size);
      const el = await page.$(".icon");
      const buf = await el.screenshot({ type: "png" });
      writeFileSync(path.join(publicDir, name), buf);
    } else {
      writeFileSync(path.join(publicDir, name), buffer);
    }

    console.log(`✅ ${name} (${size}×${size})`);
  }

  await browser.close();
  console.log("Ícones gerados em public/");
}

generate().catch((e) => { console.error(e); process.exit(1); });
