const fs = require("fs");
let c = fs.readFileSync("src/routes/zongosol/index.tsx", "utf8");

// Fix the broken line 1462 - the IIFE pattern
c = c.replace(
  /\/\*i18n\*\/ \(\(\) => \{ const k: Record<string,string>=\{wood:'zongosol\.naturalWood',metal:'zongosol\.brushedMetal',white:'zongosol\.classicWhite',green:'zongosol\.forestGreen',charcoal:'zongosol\.charcoal'\}; return t\(k\[state\.exteriorColor\]\}/g,
  't(EXTERIOR_LABEL_KEYS[state.exteriorColor])'
);

// Fix any remaining bare EXTERIOR_LABELS[ references  
c = c.replace(/EXTERIOR_LABELS\[/g, 'EXTERIOR_LABEL_KEYS[');

// Fix "Sending..." in the send form (only the one in JSX ternary)
c = c.replace(
  '{sending ? "Sending..." :',
  '{sending ? t("zongosol.sending") :'
);

// Fix the Send form field labels
c = c.replace(
  '>Send design to our team<',
  '>{t("zongosol.sendDesign")}<'
);
c = c.replace(
  'placeholder="Your name (optional)"',
  'placeholder={t("zongosol.yourName")}'
);
c = c.replace(
  'placeholder="Your email (optional)"',
  'placeholder={t("zongosol.yourEmail")}'
);
// Fix Cancel button in the send form specifically
c = c.replace(
  'onClick={() => setShowSaveForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel<',
  'onClick={() => setShowSaveForm(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">{t("zongosol.cancel")}<'
);
// Fix "Send to patrick..."
c = c.replace(
  '>Send to patrick.kitolano@kitoslight.com<',
  '>{t("zongosol.sendToPatrick")}<'
);

// Fix the EXTERIOR_LABELS in the original code - there's one in the color selector display
// The pattern is EXTERIOR_LABELS[color] which is now t(EXTERIOR_LABEL_KEYS[color])
// But there's also EXTERIOR_LABELS[state.exteriorColor] at line 1462 area

console.log("Fixes applied");
fs.writeFileSync("src/routes/zongosol/index.tsx", c);
console.log("File written successfully");
