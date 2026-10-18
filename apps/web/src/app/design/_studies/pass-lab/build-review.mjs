// Build the portable review and all three rounds of static boards and vector masters.
// No new packages; esbuild is already supplied by the repository's Vitest/Vite dependency.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const study = dirname(fileURLToPath(import.meta.url));
const web = resolve(study, "../../../../..");
const root = resolve(web, "../..");
const output = join(root, "docs/design-studies/the-pass");
const webRequire = createRequire(join(web, "package.json"));
const vitestRequire = createRequire(webRequire.resolve("vitest/package.json"));
const viteRequire = createRequire(vitestRequire.resolve("vite/package.json"));
const { build } = viteRequire("esbuild");
const options = { bundle: true, write: false, minify: true, jsx: "automatic", target: "es2020", alias: { "@": join(web, "src") }, define: { "process.env.NODE_ENV": '"production"' } };
const result = await build({
  ...options,
  stdin: { contents: 'import {createRoot} from "react-dom/client"; import {PassLab} from "./src/app/design/_studies/pass-lab/pass-lab"; createRoot(document.getElementById("root")).render(<PassLab standalone />);', resolveDir: web, loader: "tsx" },
  outfile: join(web, "pass-review.js"), format: "iife",
  plugins: [{ name: "portable-link", setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "review" }));
    b.onLoad({ filter: /.*/, namespace: "review" }, () => ({ contents: 'import {createElement} from "react"; export default function Link({children,...props}) {return createElement("a",props,children)}', resolveDir: web }));
  } }],
});
async function filesUnder(path) {
  try { const entries = await readdir(path, { withFileTypes: true }); return (await Promise.all(entries.map(e => e.isDirectory() ? filesUnder(join(path, e.name)) : [join(path, e.name)]))).flat(); }
  catch { return []; }
}
const faces = new Map();
for (const file of (await filesUnder(join(web, ".next/static/css"))).filter(f => f.endsWith(".css"))) {
  const css = await readFile(file, "utf8");
  for (const face of css.match(/@font-face\s*\{[^}]+\}/g) ?? []) {
    const family = face.match(/font-family:\s*["']?(DM Sans|Nunito Sans)["']?\s*;/)?.[1];
    const src = face.match(/url\(["']?(\/_next\/static\/media\/[^)"']+)/)?.[1];
    if (!family || !src || !/U\+0{1,4}-0{0,2}FF/i.test(face)) continue;
    const bytes = await readFile(join(web, ".next", src.replace("/_next/", "")));
    faces.set(family, face.replace(src, `data:font/woff2;base64,${bytes.toString("base64")}`));
  }
}
// The existing portable motion study already contains both licensed font subsets.
// Reuse those for an offline rebuild when a Next font cache is not present yet.
if (faces.size < 2) {
  const prior = await readFile(join(root, "docs/design-studies/overtake-motion/review.html"), "utf8");
  for (const face of prior.match(/@font-face\s*\{[^}]+\}/g) ?? []) {
    const family = face.match(/font-family:\s*["']?(DM Sans|Nunito Sans)["']?\s*;/)?.[1];
    if (family && face.includes("data:font/")) faces.set(family, face);
  }
}
if (faces.size < 2) throw new Error("Run a web build first to populate DM Sans and Nunito Sans font caches.");
const css = result.outputFiles.find(f => f.path.endsWith(".css")).text;
const js = result.outputFiles.find(f => f.path.endsWith(".js")).text.replace(/<\/script/gi, "<\\/script");
await mkdir(join(output, "icons"), { recursive: true });
await writeFile(join(output, "review.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Overtaek · The art of the pass</title><style>${[...faces.values()].join("\n")}\n:root{--font-body:'DM Sans',sans-serif;--font-overtaek:'Nunito Sans',sans-serif}*{box-sizing:border-box}body{margin:0;background:#fafaf7;color:#282f2c}button,input,select{font:inherit}${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);

const vectors = await build({ ...options, platform: "node", format: "cjs", stdin: {
  resolveDir: web, loader: "tsx", contents: `import {renderToStaticMarkup} from "react-dom/server"; import {IconArt} from "./src/app/design/_studies/pass-lab/icon-art"; import {LaneArt} from "./src/app/design/_studies/pass-lab/lane-art"; import {RefinementIcon} from "./src/app/design/_studies/pass-lab/refinement-art"; import {REFINEMENTS} from "./src/app/design/_studies/pass-lab/refinements"; import {FINALIST_BOARD,FINALIST_SHAPES,finalistSpec} from "./src/app/design/_studies/pass-lab/afterimage-finalists"; import {WAKE_CONCEPTS,wakeSpec} from "./src/app/design/_studies/pass-lab/wake-study"; import {ICONS,LANES} from "./src/app/design/_studies/pass-lab/catalog"; export const wakes=WAKE_CONCEPTS.map((c,i)=>({id:c.id,name:c.name,master:renderToStaticMarkup(<RefinementIcon spec={wakeSpec()} wake={c.id} unmasked size={1024}/>,{identifierPrefix:"wake-master-"+i}),tile:renderToStaticMarkup(<RefinementIcon spec={wakeSpec()} wake={c.id} size={256}/>,{identifierPrefix:"wake-tile-"+i})})); export const icons=ICONS.map((c,i)=>({id:c.id,name:c.name,master:renderToStaticMarkup(<IconArt id={c.id} unmasked size={1024}/>,{identifierPrefix:'master-'+i}),tile:renderToStaticMarkup(<IconArt id={c.id} size={160}/>,{identifierPrefix:'tile-'+i})})); export const lanes=LANES.map((l,i)=>({name:l.name,svg:renderToStaticMarkup(<LaneArt index={i} progress={1} gain={4.2} flow={false}/>,{identifierPrefix:'field-'+i})})); export const refinements=REFINEMENTS.map((s,i)=>({id:s.id,name:s.name,master:renderToStaticMarkup(<RefinementIcon spec={s} unmasked size={1024}/>,{identifierPrefix:'ref-master-'+i}),tile:renderToStaticMarkup(<RefinementIcon spec={s} size={180}/>,{identifierPrefix:'ref-tile-'+i})})); export const finalists=FINALIST_BOARD.map((s,i)=>({id:s.id,name:s.name,master:renderToStaticMarkup(<RefinementIcon spec={s} unmasked size={1024}/>,{identifierPrefix:'final-master-'+i}),tile:renderToStaticMarkup(<RefinementIcon spec={s} size={160}/>,{identifierPrefix:'final-tile-'+i})})); export const shapes=FINALIST_SHAPES.map((s,i)=>({id:s.id,name:s.name,master:renderToStaticMarkup(<RefinementIcon spec={finalistSpec(s.id,'club','black','subtle')} unmasked size={1024}/>,{identifierPrefix:'shape-master-'+i}),tile:renderToStaticMarkup(<RefinementIcon spec={finalistSpec(s.id,'club','black','subtle')} size={180}/>,{identifierPrefix:'shape-tile-'+i})}));` },
});
const Module = webRequire("node:module");
const mod = new Module(join(web, "pass-vector-export.cjs"));
mod.paths = Module._nodeModulePaths(web);
mod._compile(vectors.outputFiles[0].text, join(web, "pass-vector-export.cjs"));
const tiles = [];
for (const [i, icon] of mod.exports.icons.entries()) {
  await writeFile(join(output, "icons", `${String(i + 1).padStart(2, "0")}-${icon.id}.svg`), icon.master);
  const x = (i % 5) * 220 + 42, y = Math.floor(i / 5) * 250 + 120;
  tiles.push(icon.tile.replace("<svg ", `<svg x="${x}" y="${y}" `) + `<text x="${x}" y="${y + 187}" font-size="12" font-weight="600">${String(i + 1).padStart(2, "0")} / ${icon.name.replaceAll("&", "&amp;")}</text>`);
}
await writeFile(join(output, "icon-board.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1140 900" width="1140" height="900"><rect width="1140" height="900" fill="#fafaf7"/><g fill="#282f2c" font-family="Arial,sans-serif"><text x="42" y="44" font-size="11" letter-spacing="2">OVERTAEK / IDENTITY STUDY 01</text><text x="42" y="84" font-size="28" font-weight="600">The art of the pass.</text><text x="1098" y="77" text-anchor="end" font-size="11">12 symbols + 3 type experiments</text>${tiles.join("")}<text x="42" y="885" font-size="10" fill="#616c63">CONCEPT ART / 1024 PX UNMASKED SVG MASTERS INCLUDED / NOT FINAL STORE ASSETS</text></g></svg>`);
const fields = mod.exports.lanes.map((l, i) => {
  const x = (i % 4) * 282 + 28, y = Math.floor(i / 4) * 402 + 125;
  const svg = l.svg.replace("<svg ", `<svg x="${x}" y="${y}" width="246" height="341" `);
  return `<text x="${x}" y="${y - 15}" font-size="13" font-weight="600">${String(i + 1).padStart(2, "0")} / ${l.name}</text>${svg}`;
}).join("");
await writeFile(join(output, "lane-board.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="1140" height="910" viewBox="0 0 1140 910"><rect width="1140" height="910" fill="#eef0e9"/><g font-family="Arial,sans-serif" fill="#282f2c"><text x="28" y="35" font-size="11" letter-spacing="2">OVERTAEK / THE VERTICAL FIELD</text><text x="28" y="76" font-size="28" font-weight="600">Eight ways to move ahead.</text><text x="1110" y="65" text-anchor="end" font-size="10">SAME ATHLETES / SAME +4.2 KM RUN / DIFFERENT ATMOSPHERE</text>${fields}<text x="28" y="894" font-size="10" fill="#616c63">FICTIONAL RUNNING WEEK / FIXED LANES / ±3 KM AROUND YOU / PAST YOU IS NOT RANKED</text></g></svg>`);
await mkdir(join(output, "round-2-icons"), { recursive: true });
const refinedTiles = [];
for (const [i, icon] of mod.exports.refinements.entries()) {
  await writeFile(join(output, "round-2-icons", `${icon.id}.svg`), icon.master);
  const x = i % 4 * 240 + 35, y = Math.floor(i / 4) * 245 + 115;
  refinedTiles.push(icon.tile.replace("<svg ", `<svg x="${x}" y="${y}" `) + `<text x="${x}" y="${y + 204}" font-size="12">${i < 8 ? `A${String(i + 1).padStart(2, "0")}` : `O${String(i - 7).padStart(2, "0")}`} / ${icon.name}</text>`);
}
await writeFile(join(output, "round-2-board.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="865" viewBox="0 0 1000 865"><rect width="1000" height="865" fill="#eef0e9"/><g fill="#282f2c" font-family="Arial,sans-serif"><text x="35" y="35" font-size="11" letter-spacing="2">OVERTAEK / ROUND 2</text><text x="35" y="77" font-size="29" font-weight="600">A wake you can feel.</text><text x="960" y="65" text-anchor="end" font-size="11">8 AFTERIMAGE / 4 OPEN TRACK</text>${refinedTiles.join("")}<text x="35" y="852" font-size="10" fill="#616c63">STATIC ICON MASTERS / MATCHING MOVING FIELDS IN THE INTERACTIVE REVIEW</text></g></svg>`);
await mkdir(join(output, "round-3-icons"), { recursive: true });
const finalTiles = [];
const finalBoardHeight = Math.ceil(mod.exports.finalists.length / 3) * 208 + 126;
for (const [i, icon] of mod.exports.finalists.entries()) {
  await writeFile(join(output, "round-3-icons", `${icon.id}.svg`), icon.master);
  const x = i % 3 * 225 + 35, y = Math.floor(i / 3) * 208 + 110;
  finalTiles.push(icon.tile.replace("<svg ", `<svg x="${x}" y="${y}" `) + `<text x="${x}" y="${y + 181}" font-size="9">${icon.name.replace("Hollow circle · ", "")}</text>`);
}
await writeFile(join(output, "round-3-colors.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${finalBoardHeight}" viewBox="0 0 720 ${finalBoardHeight}"><rect width="720" height="${finalBoardHeight}" fill="#eef0e9"/><g fill="#282f2c" font-family="Arial,sans-serif"><text x="35" y="35" font-size="11" letter-spacing="2">OVERTAEK / AFTERIMAGE / ROUND 3</text><text x="35" y="77" font-size="26">${Math.ceil(mod.exports.finalists.length / 3)} pairings. Three backgrounds.</text>${finalTiles.join("")}<text x="35" y="${finalBoardHeight - 18}" font-size="10">YELLOW / GOLD ALWAYS LEADS · NO LANE LINES · SUBTLE WAKE DIFFERENCE</text></g></svg>`);
const shapeTiles = [];
for (const [i, icon] of mod.exports.shapes.entries()) {
  await writeFile(join(output, "round-3-icons", `${icon.id}.svg`), icon.master);
  const x = i * 220 + 35;
  shapeTiles.push(icon.tile.replace("<svg ", `<svg x="${x}" y="110" `) + `<text x="${x}" y="320" font-size="13">${icon.name}</text>`);
}
await writeFile(join(output, "round-3-shapes.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="930" height="370" viewBox="0 0 930 370"><rect width="930" height="370" fill="#eef0e9"/><g fill="#282f2c" font-family="Arial,sans-serif"><text x="35" y="35" font-size="11" letter-spacing="2">OVERTAEK / AFTERIMAGE / ROUND 3</text><text x="35" y="77" font-size="27">One idea. Four characters.</text>${shapeTiles.join("")}<text x="35" y="353" font-size="10">SAME PALETTE · SAME BACKGROUND · SAME WAKE RHYTHM</text></g></svg>`);
console.log(`Portable review, original/refinement boards and Round 3 color/shape masters written to ${output}`);

await mkdir(join(output, "wake-study-icons"), {recursive:true});
const wakes = [];
for (const [i, icon] of mod.exports.wakes.entries()) {
  await writeFile(join(output,"wake-study-icons",`${icon.id}.svg`),icon.master);
  const x=30+i*290;
  wakes.push(icon.tile.replace("<svg ", `<svg x="${x}" y="110" `)+`<text x="${x}" y="396" font-size="17">${i+1} / ${icon.name}</text>`);
}
await writeFile(join(output,"wake-study-board.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="450" viewBox="0 0 900 450"><rect width="900" height="450" fill="#eef0e9"/><g font-family="Arial,sans-serif" fill="#282f2c"><text x="30" y="40" font-size="12">OVERTAEK / FOLLOWUP / SHARED TRAIL ENDPOINT</text><text x="30" y="80" font-size="27">A longer history. A clearer pass?</text>${wakes.join("")}<text x="30" y="432" font-size="11">FOUR / SIX / EIGHT GOLD ECHOES · EXPERIMENTS ONLY · FINALIZED APP ICON UNCHANGED</text></g></svg>`);
