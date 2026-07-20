#!/usr/bin/env bun
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = join(import.meta.dirname, "..");
const RESOURCES = join(BASE, "resources");
const PUBLIC_ICONS = join(BASE, "public", "icons");

async function main() {
  await mkdir(RESOURCES, { recursive: true });

  // Use the 512px PWA icon as source, resize to 1024x1024 for Capacitor icon
  const iconSrc = join(PUBLIC_ICONS, "icon-512.png");

  // Generate icon.png (1024x1024) for Capacitor
  const iconBuf = await sharp(iconSrc).resize(1024, 1024).png().toBuffer();
  await writeFile(join(RESOURCES, "icon.png"), iconBuf);
  console.log("Created resources/icon.png (1024x1024)");

  // Generate splash.png (2732x2732) — a simple branded splash with the logo
  const splash = await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: { r: 5, g: 150, b: 105, alpha: 1 }, // #059669
    },
  })
    .png()
    .toBuffer();
  await writeFile(join(RESOURCES, "splash.png"), splash);
  console.log("Created resources/splash.png (2732x2732) — solid #059669");

  // Also copy the 192px icon as the app icon fallback
  const icon192 = await sharp(iconSrc).resize(192, 192).png().toBuffer();
  await writeFile(join(RESOURCES, "icon-192.png"), icon192);
  console.log("Created resources/icon-192.png (192x192)");

  // Copy existing icons to resources for reference
  const icon512 = await sharp(iconSrc).png().toBuffer();
  await writeFile(join(RESOURCES, "icon-512.png"), icon512);
  console.log("Created resources/icon-512.png (512x512)");

  console.log("\nApp store assets generated in resources/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
