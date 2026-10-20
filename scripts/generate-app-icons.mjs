import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const web=createRequire(resolve('apps/web/package.json'));
const next=createRequire(web.resolve('next/package.json'));
const sharp=next('sharp');
const vitest=createRequire(web.resolve('vitest/package.json'));
const vite=createRequire(vitest.resolve('vite/package.json'));
const {build}=vite('esbuild');
const Module=web('node:module');
const bundle=await build({entryPoints:[resolve('packages/shared/src/polished-identity.ts')],bundle:true,write:false,platform:'node',format:'cjs'});
const model=new Module(resolve('polished-identity.cjs'));
model._compile(bundle.outputFiles[0].text,resolve('polished-identity.cjs'));
const {polishedIconSvg}=model.exports;

async function save(path,data){await mkdir(dirname(path),{recursive:true});await writeFile(path,data);}
async function png(path,size,svg){const data=await sharp(Buffer.from(svg)).resize(size,size).png().toBuffer();await save(path,data);return data;}
const white=polishedIconSvg(),black=polishedIconSvg({dark:true});
const foreground=polishedIconSvg({transparent:true,padded:true});
await save('assets/brand/overtaek-icon.svg',white);
await save('assets/brand/overtaek-icon-black.svg',black);
await save('apps/web/src/app/icon.svg',white);
await png('apps/web/src/app/apple-icon.png',180,white);
for(const size of [192,512])await png(`apps/web/public/icons/icon-${size}.png`,size,white);
await png('apps/web/public/icons/maskable-512.png',512,polishedIconSvg({padded:true}));
await png('apps/mobile/assets/icon.png',1024,white);
await png('apps/mobile/assets/icon-black.png',1024,black);
await png('apps/mobile/assets/favicon.png',48,white);
await png('apps/mobile/assets/adaptive-icon.png',1024,foreground);
await png('apps/mobile/assets/adaptive-icon-black.png',1024,foreground);
await png('apps/mobile/assets/monochrome-icon.png',1024,polishedIconSvg({transparent:true,padded:true,monochrome:true}));
for(const [theme,svg]of [['white',white],['black',black]]){
  await save(`apps/web/public/icons/${theme}/icon.svg`,svg);
  for(const size of [16,32,48,64,180,192,512,1024])await png(`apps/web/public/icons/${theme}/icon-${size}.png`,size,svg);
  await png(`apps/web/public/icons/${theme}/maskable-512.png`,512,polishedIconSvg({dark:theme==='black',padded:true}));
}
const sizes=[16,32,48],images=await Promise.all(sizes.map(size=>sharp(Buffer.from(white)).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
images.forEach((image,i)=>{const pos=6+i*16;header[pos]=header[pos+1]=sizes[i];header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(image.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=image.length;});
await save('apps/web/src/app/favicon.ico',Buffer.concat([header,...images]));
console.log('Generated selected 162.5% polished-glass identity for web, Apple touch, Expo and Android launchers.');
console.log('White/black assets are explicit; historical circle scale studies are preserved.');
