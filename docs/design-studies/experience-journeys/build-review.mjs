// Portable build of the actual web prototype. No server or account required.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
const outputDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(outputDir, '../../..'), web = join(root, 'apps/web');
const requireWeb = createRequire(join(web, 'package.json'));
const requireVitest = createRequire(requireWeb.resolve('vitest/package.json'));
const requireVite = createRequire(requireVitest.resolve('vite/package.json'));
const { build } = requireVite('esbuild');
const result = await build({
  stdin: { contents: 'import {createRoot} from "react-dom/client"; import {ExperienceLab} from "./src/features/experience-lab/experience-lab"; import {typographyVariables} from "./src/ui/section"; document.documentElement.style.setProperty("--font-body","Manrope"); for (const [key,value] of Object.entries(typographyVariables())) document.documentElement.style.setProperty(key,value); createRoot(document.getElementById("root")).render(<ExperienceLab standalone />)', resolveDir: web, loader: 'tsx' },
  outfile: join(outputDir, 'review.js'), bundle: true, write: false, minify: true, jsx: 'automatic', format: 'iife', target: 'es2020',
  define: {'process.env.NODE_ENV':'"production"'}, alias: {'@':join(web,'src')},
  plugins: [{name:'standalone-navigation',setup(b){
    b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'review-link'}));
    b.onLoad({filter:/.*/,namespace:'review-link'},()=>({contents:'import {createElement} from "react";export default function Link(p){return createElement("a",p)}',resolveDir:web}));
    b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'review'}));
    b.onLoad({filter:/.*/,namespace:'review'},()=>({contents:'export const useSearchParams=()=>new URLSearchParams(location.search); export const useRouter=()=>({back:()=>history.back()});'}));
  }}],
});
let fonts = '';
for (const [directory, name, weight] of [['400Regular','Manrope_400Regular',400],['700Bold','Manrope_700Bold',700],['800ExtraBold','Manrope_800ExtraBold',800]]) {
  try {
    const font = await readFile(join(root,`apps/mobile/node_modules/@expo-google-fonts/manrope/${directory}/${name}.ttf`));
    fonts += `@font-face{font-family:Manrope;src:url(data:font/ttf;base64,${font.toString('base64')}) format('truetype');font-weight:${weight};font-display:swap}`;
  } catch {}
}
const css = result.outputFiles.find(f=>f.path.endsWith('.css')).text;
const js = result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');
await writeFile(join(outputDir,'review.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Overtaek · A little more feeling</title><style>${fonts}body{margin:0;background:#f8f9f6}${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
console.log('Built docs/design-studies/experience-journeys/review.html');
