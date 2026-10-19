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
  resolveDir: web, loader: "tsx", contents: `import {renderToStaticMarkup} from "react-dom/server"; import {IconArt} from "./src/app/design/_studies/pass-lab/icon-art"; import {LaneArt} from "./src/app/design/_studies/pass-lab/lane-art"; import {RefinementIcon} from "./src/app/design/_studies/pass-lab/refinement-art"; import {REFINEMENTS} from "./src/app/design/_studies/pass-lab/refinements"; import {FINALIST_BOARD,FINALIST_SHAPES,finalistSpec} from "./src/app/design/_studies/pass-lab/afterimage-finalists"; import {FINISH_BOARD} from "./src/app/design/_studies/pass-lab/finish-comparison"; import {TransmissionCheck} from "./src/app/design/_studies/pass-lab/finish-round"; import {GLASS_CONCEPTS} from "./src/app/design/_studies/pass-lab/glass-concepts"; import {GlassOverlap} from "./src/app/design/_studies/pass-lab/glass-art"; import {MaterialIcon} from "./src/app/design/_studies/pass-lab/material-art"; import {MATERIAL_CONCEPTS} from "./src/app/design/_studies/pass-lab/material-concepts"; import {WAKE_CONCEPTS,wakeSpec} from "./src/app/design/_studies/pass-lab/wake-study"; import {ICONS,LANES} from "./src/app/design/_studies/pass-lab/catalog"; export const finishes=FINISH_BOARD.flatMap((c,i)=>[false,true].map(dark=>({id:c.id,name:c.name,dark,master:renderToStaticMarkup(<MaterialIcon concept={c.spec} dark={dark} unmasked size={1024}/>,{identifierPrefix:"finish-master-"+i+dark}),tile:renderToStaticMarkup(<MaterialIcon concept={c.spec} dark={dark} size={200}/>,{identifierPrefix:"finish-tile-"+i+dark}),field:renderToStaticMarkup(<LaneArt index={4} progress={1} gain={2} flow={false} material={c.spec} materialDark={dark}/>,{identifierPrefix:"finish-field-"+i+dark})}))); export const transmission=[false,true].map(dark=>({dark,svg:renderToStaticMarkup(<TransmissionCheck dark={dark}/>,{identifierPrefix:"transmission-"+dark})})); export const glasses=GLASS_CONCEPTS.flatMap((c,i)=>[false,true].map(dark=>({id:c.id,name:c.name,opacity:c.glass.opacity,dark,master:renderToStaticMarkup(<MaterialIcon concept={c} dark={dark} unmasked size={1024}/>,{identifierPrefix:"glass-master-"+i+dark}),tile:renderToStaticMarkup(<MaterialIcon concept={c} dark={dark} size={200}/>,{identifierPrefix:"glass-tile-"+i+dark}),overlap:renderToStaticMarkup(<GlassOverlap concept={c} dark={dark} size={180}/>,{identifierPrefix:"glass-overlap-"+i+dark}),field:renderToStaticMarkup(<LaneArt index={4} progress={1} gain={2} flow={false} material={c} materialDark={dark}/>,{identifierPrefix:"glass-field-"+i+dark})}))); export const materials=MATERIAL_CONCEPTS.flatMap((c,i)=>[false,true].map(dark=>({id:c.id,name:c.name,material:c.material,dark,master:renderToStaticMarkup(<MaterialIcon concept={c} dark={dark} unmasked size={1024}/>,{identifierPrefix:"material-master-"+i+dark}),tile:renderToStaticMarkup(<MaterialIcon concept={c} dark={dark} size={200}/>,{identifierPrefix:"material-tile-"+i+dark}),field:renderToStaticMarkup(<LaneArt index={4} progress={1} gain={2} flow={false} material={c} materialDark={dark}/>,{identifierPrefix:"material-field-"+i+dark})}))); export const wakes=WAKE_CONCEPTS.map((c,i)=>({id:c.id,name:c.name,master:renderToStaticMarkup(<RefinementIcon spec={wakeSpec()} wake={c.id} unmasked size={1024}/>,{identifierPrefix:"wake-master-"+i}),tile:renderToStaticMarkup(<RefinementIcon spec={wakeSpec()} wake={c.id} size={256}/>,{identifierPrefix:"wake-tile-"+i})})); export const icons=ICONS.map((c,i)=>({id:c.id,name:c.name,master:renderToStaticMarkup(<IconArt id={c.id} unmasked size={1024}/>,{identifierPrefix:'master-'+i}),tile:renderToStaticMarkup(<IconArt id={c.id} size={160}/>,{identifierPrefix:'tile-'+i})})); export const lanes=LANES.map((l,i)=>({name:l.name,svg:renderToStaticMarkup(<LaneArt index={i} progress={1} gain={4.2} flow={false}/>,{identifierPrefix:'field-'+i})})); export const refinements=REFINEMENTS.map((s,i)=>({id:s.id,name:s.name,master:renderToStaticMarkup(<RefinementIcon spec={s} unmasked size={1024}/>,{identifierPrefix:'ref-master-'+i}),tile:renderToStaticMarkup(<RefinementIcon spec={s} size={180}/>,{identifierPrefix:'ref-tile-'+i})})); export const finalists=FINALIST_BOARD.map((s,i)=>({id:s.id,name:s.name,master:renderToStaticMarkup(<RefinementIcon spec={s} unmasked size={1024}/>,{identifierPrefix:'final-master-'+i}),tile:renderToStaticMarkup(<RefinementIcon spec={s} size={160}/>,{identifierPrefix:'final-tile-'+i})})); export const shapes=FINALIST_SHAPES.map((s,i)=>({id:s.id,name:s.name,master:renderToStaticMarkup(<RefinementIcon spec={finalistSpec(s.id,'club','black','subtle')} unmasked size={1024}/>,{identifierPrefix:'shape-master-'+i}),tile:renderToStaticMarkup(<RefinementIcon spec={finalistSpec(s.id,'club','black','subtle')} size={180}/>,{identifierPrefix:'shape-tile-'+i})}));` },
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


await mkdir(join(output, "wake-study-icons"), {recursive:true});
const wakes = [];
for (const [i, icon] of mod.exports.wakes.entries()) {
  await writeFile(join(output,"wake-study-icons",`${icon.id}.svg`),icon.master);
  const x=30+i*290;
  wakes.push(icon.tile.replace("<svg ", `<svg x="${x}" y="110" `)+`<text x="${x}" y="396" font-size="17">${i+1} / ${icon.name}</text>`);
}
await writeFile(join(output,"wake-study-board.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="450" viewBox="0 0 900 450"><rect width="900" height="450" fill="#eef0e9"/><g font-family="Arial,sans-serif" fill="#282f2c"><text x="30" y="40" font-size="12">OVERTAEK / FOLLOWUP / SHARED TRAIL ENDPOINT</text><text x="30" y="80" font-size="27">A longer history. A clearer pass?</text>${wakes.join("")}<text x="30" y="432" font-size="11">FOUR / SIX / EIGHT GOLD ECHOES · SHARED START (SIX) IS THE SELECTED APP ICON</text></g></svg>`);

const nextRequire=createRequire(webRequire.resolve("next/package.json"));
const sharp=nextRequire("sharp");
for(const dark of [false,true]) {
  const theme=dark?"black":"white";
  await mkdir(join(output,"material-icons",theme),{recursive:true});
  const tiles=[];
  for(const [i,icon] of mod.exports.materials.filter(m=>m.dark===dark).entries()) {
    await writeFile(join(output,"material-icons",theme,`${icon.id}.svg`),icon.master);
    await writeFile(join(output,"material-icons",theme,`${icon.id}-field.svg`),icon.field);
    const x=30+(i%4)*265,y=125+Math.floor(i/4)*320;
    tiles.push(icon.tile.replace("<svg ",`<svg x="${x}" y="${y}" `)+`<text x="${x}" y="${y+226}" font-size="16" font-weight="600">${icon.name}</text><text x="${x}" y="${y+249}" font-size="9" letter-spacing="1.2">${icon.material}</text>`);
  }
  const board=`<svg xmlns="http://www.w3.org/2000/svg" width="1090" height="790" viewBox="0 0 1090 790"><rect width="1090" height="790" fill="${dark?"#182025":"#eff2eb"}"/><g font-family="Arial,sans-serif" fill="${dark?"#edf1eb":"#282f2c"}"><text x="30" y="38" font-size="11" letter-spacing="2">OVERTAEK / MATERIAL OBJECTS / ROUND 5</text><text x="30" y="84" font-size="32" font-weight="600">Eight ways to catch the light.</text>${tiles.join("")}<text x="30" y="770" font-size="10">BOLD GEOMETRY / GOLD + SILVER / SHARED ICON AND LANE RENDERER / CONCEPTS ONLY</text></g></svg>`;
  await writeFile(join(output,`material-board-${theme}.svg`),board);
  const raster=board.replace(/style="transform:translateY\(([^p]+)px\);opacity:([^;]+);[^"]*"/g,'transform="translate(0 $1)" opacity="$2"');
  await sharp(Buffer.from(raster)).png().toFile(join(output,`material-board-${theme}.png`));
}
for(const dark of [false,true]) {
  const theme=dark?'black':'white';
  const figures=mod.exports.materials.filter(m=>m.dark===dark).map((m,i)=>{
    const x=24+(i%4)*268,y=105+Math.floor(i/4)*380;
    return `<text x="${x}" y="${y-13}" font-size="15" font-weight="600">${m.name}</text>`+m.field.replace('<svg ',`<svg x="${x}" y="${y}" width="238" height="330" `);
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="865" viewBox="0 0 1100 865"><rect width="1100" height="865" fill="${dark?'#182025':'#eff2eb'}"/><g font-family="Arial,sans-serif" fill="${dark?'#edf1eb':'#282f2c'}"><text x="24" y="32" font-size="11" letter-spacing="2">OVERTAEK / MATERIALS IN THE FIELD</text><text x="24" y="66" font-size="27" font-weight="600">Same race. Eight objects.</text>${figures.join('')}<text x="24" y="850" font-size="10">FICTIONAL +2KM RUN / FIXED LANES / ±3KM / PAST YOU IS UNRANKED / PRESENTATION STUDY</text></g></svg>`;
  await writeFile(join(output,`material-fields-${theme}.svg`),svg);
  const raster=svg.replace(/style="transform:translateY\(([^p]+)px\);opacity:([^;]+);[^"]*"/g,'transform="translate(0 $1)" opacity="$2"');
  await sharp(Buffer.from(raster)).png().toFile(join(output,`material-fields-${theme}.png`));
}

for(const dark of [false,true]) {
  const theme=dark?"black":"white";
  await mkdir(join(output,"glass-icons",theme),{recursive:true});
  const samples=mod.exports.glasses.filter(g=>g.dark===dark),tiles=[];
  for(const [i,glass] of samples.entries()) {
    for(const [suffix,art] of [["",glass.master],["-field",glass.field],["-overlap",glass.overlap]]) await writeFile(join(output,"glass-icons",theme,`${glass.id}${suffix}.svg`),art);
    const x=30+(i%4)*265,y=125+Math.floor(i/4)*395;
    tiles.push(glass.tile.replace("<svg ",`<svg x="${x}" y="${y}" `)+`<text x="${x}" y="${y+227}" font-size="16" font-weight="600">${glass.name}</text><text x="${x}" y="${y+249}" font-size="10" letter-spacing="1">${Math.round(glass.opacity*100)}% UNIFORM TINT</text>`+glass.overlap.replace("<svg ",`<svg x="${x}" y="${y+262}" `));
  }
  const ink=dark?"#eaf0ee":"#282f2c",bg=dark?"#182025":"#eef1eb";
  const board=`<svg xmlns="http://www.w3.org/2000/svg" width="1090" height="925" viewBox="0 0 1090 925"><rect width="1090" height="925" fill="${bg}"/><g font-family="Arial,sans-serif" fill="${ink}"><text x="30" y="38" font-size="11" letter-spacing="2">OVERTAEK / ROUND 6 / UNIFORM TINTED GLASS</text><text x="30" y="84" font-size="31" font-weight="600">Smooth faces. Overlapping color.</text>${tiles.join("")}<text x="30" y="908" font-size="10">EIGHT NEW GLASS STUDIES / CAPSULES AND LOOPS / SMALL PAIRS SHOW ALPHA OVERLAP / CONCEPTS ONLY</text></g></svg>`;
  await writeFile(join(output,`glass-board-${theme}.svg`),board);
  const raster=board.replace(/style="transform:translateY\(([^p]+)px\);opacity:([^;]+);[^"]*"/g,'transform="translate(0 $1)" opacity="$2"');
  await sharp(Buffer.from(raster)).png().toFile(join(output,`glass-board-${theme}.png`));
  const figures=samples.map((g,i)=>{const x=24+(i%4)*268,y=105+Math.floor(i/4)*380;return `<text x="${x}" y="${y-13}" font-size="15" font-weight="600">${g.name}</text>`+g.field.replace("<svg ",`<svg x="${x}" y="${y}" width="238" height="330" `);});
  const field=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="865" viewBox="0 0 1100 865"><rect width="1100" height="865" fill="${bg}"/><g font-family="Arial,sans-serif" fill="${ink}"><text x="24" y="32" font-size="11" letter-spacing="2">OVERTAEK / UNIFORM GLASS IN THE FIELD</text><text x="24" y="66" font-size="27" font-weight="600">Same movement. One smooth material.</text>${figures.join("")}<text x="24" y="850" font-size="10">FICTIONAL +2KM RUN / FIXED LANES / ±3KM / PAST YOU IS UNRANKED / PRESENTATION STUDY</text></g></svg>`;
  await writeFile(join(output,`glass-fields-${theme}.svg`),field);
  await sharp(Buffer.from(field.replace(/style="transform:translateY\(([^p]+)px\);opacity:([^;]+);[^"]*"/g,'transform="translate(0 $1)" opacity="$2"'))).png().toFile(join(output,`glass-fields-${theme}.png`));
}

console.log(`Portable review, icon/field boards and study SVG masters written to ${output}`);

for(const dark of [false,true]) {
 const theme=dark?"black":"white",bg=dark?"#182025":"#eef1eb",ink=dark?"#eaf0ee":"#282f2c";
 await mkdir(join(output,"finish-icons",theme),{recursive:true});
 const samples=mod.exports.finishes.filter(f=>f.dark===dark),tiles=[];
 for(const [i,f] of samples.entries()) {
  await writeFile(join(output,"finish-icons",theme,`${f.id}.svg`),f.master);
  await writeFile(join(output,"finish-icons",theme,`${f.id}-field.svg`),f.field);
  const x=30+i%2*290,y=125+Math.floor(i/2)*280;
  tiles.push(f.tile.replace("<svg ",`<svg x="${x}" y="${y}" `)+`<text x="${x}" y="${y+228}" font-size="14" font-weight="600">${f.name}</text>`);
 }
 const board=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1260" viewBox="0 0 600 1260"><rect width="600" height="1260" fill="${bg}"/><g font-family="Arial,sans-serif" fill="${ink}"><text x="30" y="35" font-size="10" letter-spacing="1.5">OVERTAEK / FOCUSED SHAPE AND MATERIAL REVIEW</text><text x="30" y="78" font-size="26" font-weight="600">Two shapes. Four finishes.</text><text x="30" y="102" font-size="11">UNIFORM GLASS: BOTH COLORS AT 50% · STANDARD CAPSULE: 40 × 58</text>${tiles.join("")}<text x="30" y="1240" font-size="9">CAPSULE / FINE LOOP · 38 / 50 / 64% UNIFORM GLASS IN THE INTERACTIVE REVIEW</text></g></svg>`;
 await writeFile(join(output,`finish-board-${theme}.svg`),board);
 await sharp(Buffer.from(board.replace(/style="transform:translateY\(([^p]+)px\);opacity:([^;]+);[^"]*"/g,'transform="translate(0 $1)" opacity="$2"'))).png().toFile(join(output,`finish-board-${theme}.png`));
 await writeFile(join(output,`transmission-${theme}.svg`),mod.exports.transmission.find(t=>t.dark===dark).svg);
}
