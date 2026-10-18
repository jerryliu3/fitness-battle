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
const transparent = normalized.replace('<rect width="256" height="256" fill="#ffffff"/>','');
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
