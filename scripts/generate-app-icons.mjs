import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
const web = createRequire(resolve('apps/web/package.json'));
const next = createRequire(web.resolve('next/package.json'));
const sharp = next('sharp');
const source = await readFile('assets/brand/overtaek-icon.svg', 'utf8');
// Use SVG transforms for consistent rasterization across librsvg versions.
const normalized = source.replace(/style="transform: translateY\(([^p]+)px\); opacity: ([^;]+);[^"]*"/g, 'transform="translate(0 $1)" opacity="$2"');
async function save(path, data) { await mkdir(dirname(path), {recursive:true}); await writeFile(path, data); }
async function png(path, size, svg = normalized) { const data = await sharp(Buffer.from(svg)).resize(size,size).png().toBuffer(); await save(path,data); return data; }
await save('apps/web/src/app/icon.svg', source);
await png('apps/web/src/app/apple-icon.png',180);
for (const size of [192,512]) await png(`apps/web/public/icons/icon-${size}.png`,size);
await png('apps/mobile/assets/icon.png',1024);
await png('apps/mobile/assets/favicon.png',48);
// Keep the full mark inside Android's adaptive-icon safe circle.
const transparent = normalized.replace(/<rect width="256" height="256" fill="#ffffff"(?:\/>|><\/rect>)/,'');
const foreground = transparent.replace('<g>', '<g transform="translate(128 128) scale(.72) translate(-128 -150)">');
await png('apps/mobile/assets/adaptive-icon.png',1024,foreground);
await png('apps/web/public/icons/maskable-512.png',512,foreground.replace('<g transform=', '<rect width="256" height="256" fill="#ffffff"/><g transform='));
const black = foreground.replaceAll('#dfad3c','#000000').replaceAll('#9fa5af','#000000');
const {data,info} = await sharp(Buffer.from(black)).resize(1024,1024).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4) { data[i+3]=Math.round(data[i+3]*(1-(data[i]+data[i+1]+data[i+2])/765)); data[i]=data[i+1]=data[i+2]=0; }
await save('apps/mobile/assets/monochrome-icon.png',await sharp(data,{raw:info}).png().toBuffer());
const sizes=[16,32,48], images=await Promise.all(sizes.map(size=>sharp(Buffer.from(normalized)).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+16*sizes.length); header.writeUInt16LE(1,2); header.writeUInt16LE(sizes.length,4);
let offset=header.length;
images.forEach((image,i)=>{const pos=6+i*16;header[pos]=header[pos+1]=sizes[i];header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(image.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=image.length;});
await save('apps/web/src/app/favicon.ico',Buffer.concat([header,...images]));
console.log('Generated web, Apple touch, Expo, and Android adaptive icons.');

// Explicit background assets; runtime theme selection stays with the caller.
const darkSource = source.replaceAll('#ffffff', '#000000').replace('Shared Start app icon', 'Shared Start app icon on black');
await save('assets/brand/overtaek-icon-black.svg', darkSource);
const darkNormalized = normalized.replaceAll('#ffffff', '#000000');
await png('apps/mobile/assets/icon-black.png',1024,darkNormalized);
for (const [theme, svg] of [['white',normalized],['black',darkNormalized]]) {
  await save(`apps/web/public/icons/${theme}/icon.svg`,theme === 'white' ? source : darkSource);
  for (const size of [16,32,48,64,180,192,512,1024]) await png(`apps/web/public/icons/${theme}/icon-${size}.png`,size,svg);
}

// Review only: scale each racer around its fixed head center; allow wakes to crop.
const studies = [['current',1],['roomier',1.2],['bold',1.35]];
await mkdir('docs/design-studies/the-pass/scale-study',{recursive:true});
let cards = '';
for (const [id,scale] of studies) {
  for (const [theme, original] of [['white',source],['black',darkSource]]) {
    // Each local origin is the head center. The full racer grows around it,
    // so neither head moves and the wakes can extend beyond the tile.
    const svg = scale === 1 ? original : original.replace(
      /transform="translate\((88 145|168 93)\)" data-racer=/g,
      `transform="translate($1) scale(${scale})" data-racer=`,
    );
    await save(`docs/design-studies/the-pass/scale-study/${id}-${theme}.svg`,svg);
    const label = id === 'current' ? 'Current · 100%' : id === 'roomier' ? 'Balanced · 120%' : 'Bold · 135%';
    cards += `<article><h2>${label}</h2><p>${theme === 'white' ? 'White' : 'Black'} background</p><img class="hero" src="${id}-${theme}.svg" alt="${label}, ${theme}"><div class="sizes">${[64,32,16].map(s=>`<figure><img src="${id}-${theme}.svg" width="${s}" height="${s}" alt="${s}px"><figcaption>${s}px</figcaption></figure>`).join('')}</div><a href="${id}-${theme}.svg" download>Download SVG</a></article>`;
  }
}
await save('docs/design-studies/the-pass/scale-study/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Overtaek · Shared Start scale study</title><style>*{box-sizing:border-box}body{margin:0;background:#f1f2ee;color:#252c28;font:15px/1.5 system-ui,sans-serif}main{max-width:1140px;margin:auto;padding:40px 24px}h1{font-size:40px;line-height:1.1;letter-spacing:-1.5px;margin:12px 0}header{max-width:800px;margin-bottom:32px}header small{letter-spacing:2px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{background:#fff;border:1px solid #d8dcd5;border-radius:24px;padding:24px}h2{font-size:21px;margin:0}article p{color:#68716b;margin:4px 0 20px}.hero{display:block;width:256px;max-width:100%;height:auto;border-radius:22.3%;border:1px solid #eee;margin:auto}.sizes{display:flex;align-items:center;justify-content:center;gap:24px;height:116px}figure{margin:0;text-align:center}figure img{border-radius:22.3%;display:block}figcaption{font-size:11px;color:#68716b}a{color:inherit;font-size:13px}@media(max-width:600px){.grid{grid-template-columns:1fr}h1{font-size:32px}}</style><main><header><small>OVERTAEK / SHARED START</small><h1>Bigger circles. Same centers.</h1><p>Current composition, plus 120% and 135% scales with each leading circle fixed at its original center. All keep the selected six gold echoes and four silver echoes. Rounded previews show typical icon masking; SVG downloads stay square.</p><p><b>Recommendation: compare 120% first.</b> It gives the circles more presence without shifting their positions. Wakes grow backward and may crop at the tile edge. 135% is the bolder option. Production scale remains unchanged pending review. Both black and white assets are now available.</p></header><div class="grid">${cards}</div></main></html>`);
console.log('Generated explicit black/white assets and a three-scale review.');
await png('apps/mobile/assets/adaptive-icon-black.png',1024,foreground.replaceAll('#ffffff','#000000'));
for (const [theme, paint] of [['white','#ffffff'],['black','#000000']]) {
  const layer = foreground.replaceAll('#ffffff',paint).replace('<g transform=',`<rect width="256" height="256" fill="${paint}"/><g transform=`);
  await png(`apps/web/public/icons/${theme}/maskable-512.png`,512,layer);
}
const comparisonTiles=[];
for(const [i,[id]] of studies.entries()) for(const [j,theme] of ['white','black'].entries()) {
  const svg=(await readFile(`docs/design-studies/the-pass/scale-study/${id}-${theme}.svg`,'utf8')).replace(/style="transform: translateY\(([^p]+)px\); opacity: ([^;]+);[^"]*"/g,'transform="translate(0 $1)" opacity="$2"');
  comparisonTiles.push({input:await sharp(Buffer.from(svg)).resize(220,220).png().toBuffer(),left:20+i*250,top:50+j*260});
}
const comparisonLabels=Buffer.from('<svg width="770" height="580"><g font-family="sans-serif" font-size="17" fill="#252c28"><text x="20" y="30">Current · 100%</text><text x="270" y="30">Balanced · 120%</text><text x="520" y="30">Bold · 135%</text></g></svg>');
await save('docs/design-studies/the-pass/scale-study/comparison.png',await sharp({create:{width:770,height:580,channels:4,background:'#e9ece6'}}).composite([...comparisonTiles,{input:comparisonLabels,left:0,top:0}]).png().toBuffer());
