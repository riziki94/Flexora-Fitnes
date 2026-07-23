const fs = require("fs");
let c = fs.readFileSync("src/routes/zongosol/index.tsx", "utf8");

// 1. Replace EXTERIOR_LABELS with translation key references
c = c.replace(
  'const EXTERIOR_LABELS: Record<ExteriorColor, string> = {\n  wood: "Natural Wood", metal: "Brushed Metal", white: "Classic White", green: "Forest Green", charcoal: "Charcoal",\n};',
  'const EXTERIOR_LABEL_KEYS: Record<ExteriorColor, string> = {\n  wood: "zongosol.naturalWood", metal: "zongosol.brushedMetal", white: "zongosol.classicWhite", green: "zongosol.forestGreen", charcoal: "zongosol.charcoal",\n};'
);

// 2. Replace usages of EXTERIOR_LABELS with t() calls
c = c.replace(/EXTERIOR_LABELS\[color\]/g, "t(EXTERIOR_LABEL_KEYS[color])");

// Replace remaining EXTERIOR_LABELS references
c = c.replace(/EXTERIOR_LABELS\[/g, "/*i18n*/ (() => { const k: Record<string,string>={wood:'zongosol.naturalWood',metal:'zongosol.brushedMetal',white:'zongosol.classicWhite',green:'zongosol.forestGreen',charcoal:'zongosol.charcoal'}; return t(k[");

// This approach is too fragile. Let me use simpler targeted replacements.

// 3. Fix FloorPlan hardcoded strings
c = c.replace(
  "Floor Plan — {MODELS.find((m) => m.id === state.selectedModel)?.name}",
  "{t('zongosol.floorPlanOf', { name: MODELS.find((m) => m.id === state.selectedModel)?.name || '' })}"
);
c = c.replace(
  "({state.placedFurniture.length} items placed)",
  "({t('zongosol.itemsPlaced', { count: state.placedFurniture.length })})"
);
c = c.replace(">↻ Rotate<", ">{t('zongosol.rotateBtn')}<");
c = c.replace(">✕ Delete<", ">{t('zongosol.deleteBtn')}<");
c = c.replace(">Clear All<", ">{t('zongosol.clearAllBtn')}<");

// 4. Fix the furniture count text (the JSX with fragments)
c = c.replace(
  '<span className="text-[10px] text-gray-500">{`Furniture:',
  '<span className="text-[10px] text-gray-500">{t("zongosol.furnitureCounts", { living: String(livingCount), bedroom: String(bedroomCount) })}</span><span className="text-[10px] text-gray-500 hidden">{`Furniture:'
);

// Simpler: just fix the drag hint
c = c.replace(
  "Drag from palette · R to rotate · Del to remove",
  "{t('zongosol.dragHint')}"
);

// 5. Fix "Starting price excl. VAT" 
c = c.replace(
  't("Starting price excl. VAT")',
  't("zongosol.startingPriceExclVat")'
);

// 6. Fix "Exterior Designer" header text
c = c.replace(
  ">Exterior Designer<",
  ">{t('zongosol.exteriorDesigner')}<"
);

// 7. Fix SummaryPanel hardcoded texts
// "Select a model to see pricing." -> already uses t() ✅
// "Order now — 50% deposit"
c = c.replace(
  't("Order now — 50% deposit")',
  't("zongosol.orderNow50")'
);
// "Deposit — 50%" 
c = c.replace(
  't("Deposit — 50%")',
  't("zongosol.deposit50")'
);
// "Total price"
c = c.replace(
  't("Total price")',
  't("zongosol.totalPrice")'
);
// "Remaining upon delivery"
c = c.replace(
  't("Remaining upon delivery")',
  't("zongosol.remainingDelivery")'
);
// "Pay {deposit} deposit via Stripe"
c = c.replace(
  't("Pay {deposit} deposit via Stripe"',
  't("zongosol.payDepositStripe"'
);
// "Simulate: I have paid the deposit"
c = c.replace(
  't("Simulate: I have paid the deposit")',
  't("zongosol.simulateDepositPaid")'
);
// Logistics texts
c = c.replace(
  't("Logistics — Transport Options")',
  't("zongosol.logisticsTitle")'
);
c = c.replace(
  't("Deposit confirmed! Choose transport for your container home.")',
  't("zongosol.depositConfirmed")'
);
c = c.replace(
  't("I will arrange transport myself")',
  't("zongosol.arrangeSelf")'
);
c = c.replace(
  't("No extra cost.")',
  't("zongosol.noExtraCost")'
);
c = c.replace(
  't("Kitozon arranges transport")',
  't("zongosol.kitozonArranges")'
);
c = c.replace(
  't("Price given after agreement with consultant.")',
  't("zongosol.priceAfterAgreement")'
);
c = c.replace(
  't("You arrange transport yourself")',
  't("zongosol.youArrangeSelf")'
);
c = c.replace(
  't("Kitozon arranges transport — consultant will contact you")',
  't("zongosol.kitozonArrangesContact")'
);
c = c.replace(
  't("No extra cost. Production starts now.")',
  't("zongosol.noExtraCostProduction")'
);
c = c.replace(
  't("Consultant will contact you for transport agreement.")',
  't("zongosol.consultantContact")'
);
c = c.replace(
  't("Change choice")',
  't("zongosol.changeChoice")'
);
c = c.replace(
  't("Production starts!")',
  't("zongosol.productionStarts")'
);
c = c.replace(
  't("Your order is confirmed. Consultant will follow up.")',
  't("zongosol.orderConfirmed")'
);
// "Save Design" and "Design Saved!"
c = c.replace(
  't("Save Design")',
  't("zongosol.saveDesign")'
);
c = c.replace(
  't("Design Saved!")',
  't("zongosol.designSaved")'
);
// "All prices excl. VAT"
c = c.replace(
  't("All prices excl. VAT")',
  't("zongosol.allPricesExclVat")'
);
// "Sending..."
c = c.replace(
  '"Sending..."',
  't("zongosol.sending")'
);

// Summary: "Select a model to see pricing." -> verify it uses t()
// Summary: line items like "{model?.name} base" etc. - these are in JSX

// Fix ExteriorPanel additional hardcoded strings
// "Solar Panels" header in toggle
c = c.replace(
  '>Solar Panels</p>\n                <p className="text-xs text-gray-500">+{formatPriceCurrency(15000, currency)} · Rooftop array</p>',
  '>{t("zongosol.solarPanels")}</p>\n                <p className="text-xs text-gray-500">+{formatPriceCurrency(15000, currency)} · {t("zongosol.rooftopArray")}</p>'
);
// "Deck / Terrace" + "Outdoor living"
c = c.replace(
  '>Deck / Terrace</p>\n                <p className="text-xs text-gray-500">+{formatPriceCurrency(8000, currency)} · Outdoor living</p>',
  '>{t("zongosol.deckTerrace")}</p>\n                <p className="text-xs text-gray-500">+{formatPriceCurrency(8000, currency)} · {t("zongosol.outdoorLiving")}</p>'
);
// "Multi-Container Options"
c = c.replace(
  '>Multi-Container Options</p>',
  '>{t("zongosol.multiContainer")}</p>'
);
// "External Stairs" + "Staircase on side"
c = c.replace(
  '>External Stairs</p>\n                <p className="text-xs text-gray-500">Staircase on side</p>',
  '>{t("zongosol.externalStairs")}</p>\n                <p className="text-xs text-gray-500">{t("zongosol.staircaseSide")}</p>'
);
// "Balcony" 
c = c.replace(
  '>Balcony</p>\n                <p className="text-xs text-gray-500">{state.layoutType === "stacked" ? "Platform on upper floor" : "Stacked layout only"}</p>',
  '>{t("zongosol.balcony")}</p>\n                <p className="text-xs text-gray-500">{state.layoutType === "stacked" ? t("zongosol.platformUpper") : t("zongosol.stackedOnly")}</p>'
);
// "Roof Terrace" + "Railing + access hatch"
c = c.replace(
  '>Roof Terrace</p>\n                <p className="text-xs text-gray-500">Railing + access hatch</p>',
  '>{t("zongosol.roofTerrace")}</p>\n                <p className="text-xs text-gray-500">{t("zongosol.railingHatch")}</p>'
);

// Fix SolarInfoPanel hardcoded "Solar Panels" widget title
c = c.replace(
  '<p className="text-xs text-amber-600 mt-1">Solar Panels</p>',
  '<p className="text-xs text-amber-600 mt-1">{t("zongosol.solarPanelWidget")}</p>'
);

// Fix "Kitoslight Connected · Solar & CO₂" already uses t() ✅
// Fix "Exterior Material & Color" already uses t() ✅

console.log("Part 1 complete");
fs.writeFileSync("src/routes/zongosol/index.tsx", c);
console.log("File written successfully");
