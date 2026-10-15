/** Compile src/mascot/index.ts to a temporary CommonJS directory, then pass that directory here. */
const fs = require("node:fs");
const path = require("node:path");
const compiled = process.argv[2];
const output = path.resolve(process.argv[3] || "docs/mascot");
if (!compiled) throw new Error("Usage: node export-mascot.cjs <compiled-model-directory> <output-directory>");
const { EMBER_MODEL, EMBER_REST, EMBER_CLIPS, EMBER_ACTIONS, sampleEmber, exportEmberSvg } = require(path.resolve(compiled, "index.js"));
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "ember-neutral.svg"), exportEmberSvg());
fs.writeFileSync(path.join(output, "star-ember-model-v1.json"), JSON.stringify({ model: EMBER_MODEL, rest: EMBER_REST, clips: EMBER_CLIPS }, null, 2) + "\n");
const samples = { idle: 0.3, wave: 0.47, hop: 0.49, run: 0.2, celebrate: 0.32, dash: 0.4 };
const cells = EMBER_ACTIONS.map((action, i) => {
  const svg = exportEmberSvg({ pose: sampleEmber(action, EMBER_CLIPS[action].duration * samples[action]) })
    .replaceAll("ember-export", `ember-sheet-${i}`)
    .replace('<svg xmlns=', `<svg x="${i * 240 + 30}" y="70" width="220" height="245" xmlns=`);
  return `${svg}<text x="${i * 240 + 140}" y="345" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="600" fill="#12141a">${action[0].toUpperCase() + action.slice(1)}</text>`;
}).join("");
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1480 390"><rect width="1480" height="390" rx="24" fill="#eef1f4"/><text x="40" y="38" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="3" fill="#5c6578">STAR EMBER · ONE MODEL / SIX MOTIONS</text>${cells}</svg>`;
fs.writeFileSync(path.join(output, "ember-pose-sheet.svg"), sheet);
console.log(`Exported neutral SVG, pose sheet and model JSON to ${output}`);
