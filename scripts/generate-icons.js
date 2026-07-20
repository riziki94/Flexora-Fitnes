// Generates PWA icons: green (#059669) background with white "K"
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconDir = join(__dirname, "..", "public", "icons");

async function svgIcon(size, padding = 0) {
  // Create an SVG with a rounded square green background and white "K"
  const viewSize = size;
  const innerSize = size - padding * 2;
  const radius = Math.round(viewSize * 0.2);

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${viewSize}" height="${viewSize}" viewBox="0 0 ${viewSize} ${viewSize}">
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${radius}" ry="${radius}" fill="#059669"/>
  <text x="${viewSize / 2}" y="${viewSize / 2}" dominant-baseline="central" text-anchor="middle" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.round(size * 0.55)}" font-weight="bold">K</text>
</svg>`);
}

async function generate() {
  // 192x192
  const svg192 = await svgIcon(192);
  await sharp(svg192).png().toFile(join(iconDir, "icon-192.png"));
  console.log("Generated icon-192.png");

  // 512x512
  const svg512 = await svgIcon(512);
  await sharp(svg512).png().toFile(join(iconDir, "icon-512.png"));
  console.log("Generated icon-512.png");

  // 512x512 maskable (with padding for safe zone)
  const svgMaskable = await svgIcon(512, 80);
  await sharp(svgMaskable).png().toFile(join(iconDir, "icon-maskable.png"));
  console.log("Generated icon-maskable.png");

  // favicon 32x32
  const svgFavicon = await svgIcon(32);
  await sharp(svgFavicon).resize(32, 32).toFile(join(__dirname, "..", "public", "favicon.ico"));
  console.log("Generated favicon.ico");
}

generate().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
