// Generates iOS splash screens from the 512x512 icon
// Creates properly sized splash screens for all iPhone/iPad sizes
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const splashDir = join(publicDir, "splash");
const iconPath = join(publicDir, "flexora-icon-512.png");

mkdirSync(splashDir, { recursive: true });

// Apple splash screen definitions: [width, height, filename]
const splashScreens = [
  // iPhone SE / iPod Touch
  [640, 1136, "iphone_se_640x1136.png"],
  // iPhone 6/7/8
  [750, 1334, "iphone_6_750x1334.png"],
  // iPhone 6+/7+/8+
  [1242, 2208, "iphone_6plus_1242x2208.png"],
  // iPhone X / XS
  [1125, 2436, "iphone_x_1125x2436.png"],
  // iPhone XR / 11
  [828, 1792, "iphone_xr_828x1792.png"],
  // iPhone XS Max / 11 Pro Max
  [1242, 2688, "iphone_xsmax_1242x2688.png"],
  // iPhone 12/13/14
  [1170, 2532, "iphone_12_1170x2532.png"],
  // iPhone 12/13/14 Pro Max
  [1284, 2778, "iphone_12promax_1284x2778.png"],
  // iPhone 14 Pro
  [1179, 2556, "iphone_14pro_1179x2556.png"],
  // iPad Mini / Air (2x)
  [1536, 2048, "ipad_mini_1536x2048.png"],
  // iPad Pro 10.5"
  [1668, 2224, "ipad_pro10_1668x2224.png"],
  // iPad Pro 11"
  [1668, 2388, "ipad_pro11_1668x2388.png"],
  // iPad Pro 12.9"
  [2048, 2732, "ipad_pro12_2048x2732.png"],
];

const THEME_COLOR = "#1A56DB"; // Flexora blue
const ICON_SIZE_RATIO = 0.22; // Logo takes 22% of the smaller dimension

async function generateSplash(width, height, filename) {
  const bgLayer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: THEME_COLOR,
    },
  }).png().toBuffer();

  // Load and resize the icon
  const iconSize = Math.round(Math.min(width, height) * ICON_SIZE_RATIO);
  const resizedIcon = await sharp(iconPath)
    .resize(iconSize, iconSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Composite: center the icon on the blue background
  const left = Math.round((width - iconSize) / 2);
  const top = Math.round((height - iconSize) / 2);

  await sharp(bgLayer)
    .composite([{ input: resizedIcon, left, top }])
    .png()
    .toFile(join(splashDir, filename));

  console.log(`  ✓ ${filename} (${width}x${height})`);
}

async function main() {
  console.log("Generating iOS splash screens...");
  for (const [w, h, name] of splashScreens) {
    await generateSplash(w, h, name);
  }
  console.log(`Done! ${splashScreens.length} splash screens created in ${splashDir}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
