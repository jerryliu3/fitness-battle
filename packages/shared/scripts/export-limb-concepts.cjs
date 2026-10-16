/** Compile the mascot to temporary CommonJS first, as for export-mascot.cjs. */
const fs = require("node:fs");
const path = require("node:path");
const compiled = process.argv[2], output = path.resolve(process.argv[3] || "docs/mascot");
if (!compiled) throw new Error("Usage: node export-limb-concepts.cjs <compiled-model-directory> [output-directory]");
const { exportEmberSvg, sampleLimbMorphPreview, EMBER_LIMB_PREVIEW_DURATION } = require(path.resolve(compiled,"index.js"));
const sharp = require(require.resolve("sharp",{paths:[fs.realpathSync("apps/web/node_modules/next")]}));
const width=720, height=400;
function frame(progress) {
  const cells=["crest-first","race-start"].map((concept,i)=>{
    const svg=exportEmberSvg({morph:1-progress,morphConcept:concept,shadow:false})
      .replaceAll("ember-export",`ember-concept-${i}`)
      .replace("<svg xmlns=",`<svg x="${i*360+20}" y="20" width="320" height="330" xmlns=`);
    return `${svg}<text x="${i*360+180}" y="368" text-anchor="middle" fill="#fff9e9" font-family="sans-serif" font-size="18">${i===0?"01 · Crest first":"02 · Race start"}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#24182f"/>${cells}</svg>`;
}
async function render() {
  fs.mkdirSync(output,{recursive:true});
  const frames=[];
  for(let ms=0;ms<EMBER_LIMB_PREVIEW_DURATION;ms+=50) frames.push(await sharp(Buffer.from(frame(sampleLimbMorphPreview(ms)))).ensureAlpha().raw().toBuffer());
  await sharp(Buffer.concat(frames),{raw:{width,height:height*frames.length,channels:4,pageHeight:height}})
    .gif({loop:0,delay:Array(frames.length).fill(50),colours:128,dither:0,effort:3})
    .toFile(path.join(output,"ember-limb-concepts.gif"));
  console.log(`Rendered limb concepts to ${output}`);
}
render().catch(error=>{console.error(error);process.exitCode=1;});
