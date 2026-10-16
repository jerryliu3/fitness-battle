/** Compile src/mascot/index.ts to CommonJS, then pass that directory here. */
const fs = require("node:fs");
const path = require("node:path");
const compiled = process.argv[2], output = path.resolve(process.argv[3] || "docs/mascot");
if (!compiled) throw new Error("Usage: node export-skid-study.cjs <compiled-model-directory> [output-directory]");
const {exportEmberSvg,sampleEmberSkid,emberAirGroundY,EMBER_K_SIZE_EM,EMBER_SKID_TOUCHDOWN,EMBER_LAUNCH_DURATION} = require(path.resolve(compiled,"index.js"));
const sharp = require(require.resolve("sharp",{paths:[fs.realpathSync("apps/web/node_modules/next")]}));
const width=720,height=440;
function frame(progress) {
  const f=sampleEmberSkid(progress,{returnToK:true});
  const t=Math.max(0,Math.min(1,(progress-.42)/.08));
  const ground=progress>.42&&progress<EMBER_SKID_TOUCHDOWN?emberAirGroundY(f.pose,f.flight,f.crouch,f.skid,f.scale)*t*t*(3-2*t):0;
  const y=f.y*60+ground*(260/EMBER_K_SIZE_EM-60);
  const svg=exportEmberSvg({pose:f.pose,morph:f.morph,morphConcept:"crest-launch",launchFlight:f.flight,launchCrouch:f.crouch,launchSkid:f.skid,skidSpray:f.spray,landingDust:f.landingDust,shadow:false})
    .replace("<svg xmlns=",'<svg x="230" y="0" width="260" height="350.278" overflow="visible" xmlns=');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#24182f"/><path d="M 60 298.6 H 660 M 465.1 294 V 305" stroke="#cbbbd6" stroke-opacity="${progress>=.685&&progress<.775?.3:0}"/><g transform="translate(${f.x*60} ${y})"><g transform="translate(360 350.278) scale(${f.scale*f.facing} ${f.scale}) translate(-360 -350.278)">${svg}</g></g><text x="360" y="380" text-anchor="middle" fill="#fff9e9" font-family="sans-serif" font-size="18">Crest first · ${f.phase.replaceAll("&","&amp;")}</text><text x="360" y="417" text-anchor="middle" fill="#cbbbd6" font-family="sans-serif" font-size="13">Lower hop → slide with spray → turn directly into K</text></svg>`;
}
async function render() {
  fs.mkdirSync(output,{recursive:true});
  const frames=[];
  for(let ms=0;ms<=EMBER_LAUNCH_DURATION;ms+=40) frames.push(await sharp(Buffer.from(frame(ms/EMBER_LAUNCH_DURATION))).ensureAlpha().raw().toBuffer());
  await sharp(Buffer.concat(frames),{raw:{width,height:height*frames.length,channels:4,pageHeight:height}})
    .gif({loop:0,delay:frames.map((_,i)=>i===frames.length-1?800:40),colours:128,dither:0,effort:3})
    .toFile(path.join(output,"ember-front-foot-skid.gif"));
  console.log(`Rendered front-foot skid study to ${output}`);
}
render().catch(error=>{console.error(error);process.exitCode=1;});
