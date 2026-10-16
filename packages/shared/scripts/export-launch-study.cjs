/** Compile src/mascot/index.ts to CommonJS, then pass that directory here. */
const fs = require("node:fs");
const path = require("node:path");
const compiled = process.argv[2], output = path.resolve(process.argv[3] || "docs/mascot");
if (!compiled) throw new Error("Usage: node export-launch-study.cjs <compiled-model-directory> [output-directory]");
const {exportEmberSvg,sampleEmberLaunch,EMBER_LAUNCH_DURATION} = require(path.resolve(compiled,"index.js"));
const sharp = require(require.resolve("sharp",{paths:[fs.realpathSync("apps/web/node_modules/next")]}));
const width=720,height=440;
function frame(progress) {
  const f=sampleEmberLaunch(progress,"crest-launch",{returnToK:true});
  const svg=exportEmberSvg({pose:f.pose,morph:f.morph,morphConcept:"crest-launch",launchFlight:f.flight,launchCrouch:f.crouch,landingDust:f.landingDust,shadow:false})
    .replace("<svg xmlns=",'<svg x="215" y="0" width="290" height="350" overflow="visible" xmlns=');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#24182f"/><g transform="translate(${f.x*34} ${f.y*60-f.flight*26})"><g transform="translate(360 330) scale(${f.scale*f.facing} ${f.scale}) translate(-360 -330)">${svg}</g></g><text x="360" y="380" text-anchor="middle" fill="#fff9e9" font-family="sans-serif" font-size="18">Crest first · ${f.phase.replaceAll("&","&amp;")}</text><text x="360" y="417" text-anchor="middle" fill="#cbbbd6" font-family="sans-serif" font-size="13">Crouch → spring → accelerate → skid → held stance → K</text></svg>`;
}
async function render() {
  fs.mkdirSync(output,{recursive:true});
  const frames=[];
  for(let ms=0;ms<=EMBER_LAUNCH_DURATION;ms+=40) frames.push(await sharp(Buffer.from(frame(ms/EMBER_LAUNCH_DURATION))).ensureAlpha().raw().toBuffer());
  await sharp(Buffer.concat(frames),{raw:{width,height:height*frames.length,channels:4,pageHeight:height}})
    .gif({loop:0,delay:frames.map((_,i)=>i===frames.length-1?800:40),colours:128,dither:0,effort:3})
    .toFile(path.join(output,"ember-crest-launch-and-skid.gif"));
  console.log(`Rendered crest-first launch study to ${output}`);
}
render().catch(error=>{console.error(error);process.exitCode=1;});
