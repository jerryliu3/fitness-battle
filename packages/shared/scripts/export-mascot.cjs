/** Compile src/mascot/index.ts to a temporary CommonJS directory, then pass that directory here. */
const fs = require("node:fs");
const path = require("node:path");
const compiled = process.argv[2];
const output = path.resolve(process.argv[3] || "docs/mascot");
if (!compiled) throw new Error("Usage: node export-mascot.cjs <compiled-model-directory> <output-directory>");
const { EMBER_MODEL, EMBER_REST, EMBER_CLIPS, EMBER_ACTIONS, sampleEmber, exportEmberSvg } = require(path.resolve(compiled, "index.js"));
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "ember-neutral.svg"), exportEmberSvg());
fs.writeFileSync(path.join(output, `star-ember-model-v${EMBER_MODEL.version}.json`), JSON.stringify({ model: EMBER_MODEL, rest: EMBER_REST, clips: EMBER_CLIPS }, null, 2) + "\n");
function sheet(actions, title) {
  const columns = 3, width = 1000, height = 65 + Math.ceil(actions.length / columns) * 330;
  const cells = actions.map((action, i) => {
    const x = (i % columns) * 320 + 30, y = Math.floor(i / columns) * 330 + 55;
    const svg = exportEmberSvg({ pose: sampleEmber(action, EMBER_CLIPS[action].duration * EMBER_CLIPS[action].poster) })
      .replaceAll("ember-export", `ember-sheet-${i}`)
      .replace('<svg xmlns=', `<svg x="${x}" y="${y}" width="300" height="285" xmlns=`);
    return `${svg}<text x="${x + 150}" y="${y + 300}" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="600" fill="#12141a">${EMBER_CLIPS[action].label}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="24" fill="#eef1f4"/><text x="35" y="35" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="2" fill="#5c6578">${title}</text>${cells}</svg>`;
}
fs.writeFileSync(path.join(output, "ember-pose-sheet.svg"), sheet(EMBER_ACTIONS, "STAR EMBER · ONE SILHOUETTE / NINE MOTIONS"));
fs.writeFileSync(path.join(output, "ember-flight-sheet.svg"), sheet(["flyForward", "flyDiagonal", "jumpUp"], "STAR EMBER · FORWARD / DIAGONAL / UPWARD"));
console.log(`Exported neutral SVG, pose sheets and model JSON to ${output}`);

// Optional review media, using Next's existing Sharp dependency. The model itself has no dependencies.
if (process.argv.includes("--previews")) {
  async function previews() {
    const sharp = require(require.resolve("sharp", { paths: [fs.realpathSync("apps/web/node_modules/next")] }));
    for (const name of ["ember-pose-sheet", "ember-flight-sheet"]) {
      await sharp(path.join(output, `${name}.svg`)).png().toFile(path.join(output, `${name}.png`));
    }
    const width = 1000, height = 400, frameCount = 64, frames = [];
    const actions = ["flyForward", "flyDiagonal", "jumpUp", "dash"];
    for (let frame = 0; frame < frameCount; frame++) {
      const time = frame * 50;
      const cells = actions.map((action, i) => {
        const svg = exportEmberSvg({ pose: sampleEmber(action, time) })
          .replaceAll("ember-export", `ember-review-${i}`)
          .replace('<svg xmlns=', `<svg x="${i * 250 + 5}" y="40" width="240" height="320" xmlns=`);
        return `${svg}<text x="${i * 250 + 125}" y="380" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="600" fill="#12141a">${EMBER_CLIPS[action].label}</text>`;
      }).join("");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#eef1f4"/><text x="25" y="28" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="2" fill="#5c6578">STAR EMBER · JOINT MOTION / DIRECTIONAL DEPTH</text>${cells}</svg>`;
      frames.push(await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer());
    }
    await sharp(Buffer.concat(frames), { raw: { width, height: height * frameCount, channels: 4, pageHeight: height } })
      .gif({ loop: 0, delay: Array(frameCount).fill(50), colours: 128, dither: 0, effort: 3 }).toFile(path.join(output, "ember-motion-review.gif"));
    console.log("Rendered PNG sheets and a 20 fps motion review GIF");
  }
  previews().catch(error => { console.error(error); process.exitCode = 1; });
}
