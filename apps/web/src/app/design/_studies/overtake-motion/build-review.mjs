// Rebuild the portable review from the same React sources used by /design/motion.
// Run after pnpm install and a web build/dev run (which provides the font cache).
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const study = dirname(fileURLToPath(import.meta.url));
const web = resolve(study, "../../../../..");
const root = resolve(web, "../..");
const webRequire = createRequire(join(web, "package.json"));
// Reuse the bundler already installed by the workspace's Vitest/Vite dependency.
const vitestRequire = createRequire(webRequire.resolve("vitest/package.json"));
const viteRequire = createRequire(vitestRequire.resolve("vite/package.json"));
const { build } = viteRequire("esbuild");

const result = await build({
  stdin: {
    contents: 'import {createRoot} from "react-dom/client"; import {MotionLab} from "./src/app/design/_studies/overtake-motion/motion-lab"; createRoot(document.getElementById("root")).render(<MotionLab standalone />);',
    resolveDir: web,
    loader: "tsx",
  },
  outfile: join(web, "motion-review.js"),
  write: false,
  bundle: true,
  minify: true,
  jsx: "automatic",
  format: "iife",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "@": join(web, "src") },
  plugins: [{
    name: "standalone-links",
    setup(b) {
      b.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "review" }));
      b.onLoad({ filter: /.*/, namespace: "review" }, () => ({
        contents: 'import {createElement} from "react"; export default function Link({children,...props}) {return createElement("a",props,children)}',
        resolveDir: web,
      }));
    },
  }],
});

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)]));
  return nested.flat();
}

const cssFiles = (await filesUnder(join(web, ".next/static/css"))).filter(file => file.endsWith(".css"));
const faces = new Map();
for (const file of cssFiles) {
  const css = await readFile(file, "utf8");
  for (const face of css.match(/@font-face\s*\{[^}]+\}/g) || []) {
    const family = face.match(/font-family:\s*["']?(DM Sans|Nunito Sans)["']?\s*;/)?.[1];
    const source = face.match(/url\(["']?(\/_next\/static\/media\/[^)"']+)/)?.[1];
    if (!family || !source || !/(?:U\+0{1,4}-0{0,2}FF|U\+00\?\?)/i.test(face)) continue;
    const bytes = await readFile(join(web, ".next", source.replace("/_next/", "")));
    faces.set(family, face.replace(source, `data:font/woff2;base64,${bytes.toString("base64")}`));
  }
}
if (faces.size !== 2) throw new Error("DM Sans and Nunito Sans font caches are required. Run the web app or web build first.");
const fonts = [...faces.values()].join("\n");
const css = result.outputFiles.find(file => file.path.endsWith(".css")).text;
const js = result.outputFiles.find(file => file.path.endsWith(".js")).text.replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Overtaek · Motion playground</title><style>${fonts}\n:root{--font-body:'DM Sans',sans-serif;--font-overtaek:'Nunito Sans',sans-serif}*{box-sizing:border-box}body{margin:0;background:#fafbf8;color:#26382d}button,input,select{font:inherit;color:inherit}a{color:inherit}${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
const output = join(root, "docs/design-studies/overtake-motion/review.html");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, html);
console.log(`Portable review: ${output} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
