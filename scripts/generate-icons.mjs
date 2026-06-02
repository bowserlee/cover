// One-shot script to generate Cover's PWA icons.
// Run: node scripts/generate-icons.mjs
// Outputs: public/icons/icon-{192,512}.png + apple-touch-icon.png

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ICONS = path.resolve(__dirname, "..", "public", "icons");

function svgIcon(size) {
  const corner = Math.round(size * 0.22);
  const stroke = Math.round(size * 0.085);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.27;
  // Draw a "C" as an arc opening to the right: from upper-right around to lower-right.
  // Sweep from angle -55deg to angle 235deg (going counter-clockwise) gives a clean C.
  const startAngle = -55 * (Math.PI / 180);
  const endAngle = 235 * (Math.PI / 180);
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  // largeArcFlag=1 because we're sweeping > 180deg
  const arcPath = `M ${x1} ${y1} A ${r} ${r} 0 1 0 ${x2} ${y2}`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${corner}" fill="#000000"/>
    <path d="${arcPath}" stroke="#ffffff" stroke-width="${stroke}" stroke-linecap="round" fill="none"/>
  </svg>`;
}

async function renderIcon(size, outName) {
  const svg = svgIcon(size);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const outPath = path.join(PUBLIC_ICONS, outName);
  await writeFile(outPath, png);
  console.log(`✓ ${outName} (${size}x${size})`);
}

await renderIcon(192, "icon-192.png");
await renderIcon(512, "icon-512.png");
// iOS uses apple-touch-icon at 180x180 by convention
await renderIcon(180, "apple-touch-icon.png");

console.log("\nAll icons generated.");
