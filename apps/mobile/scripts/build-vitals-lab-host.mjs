#!/usr/bin/env node
/**
 * Bundles the Vitals Lab WebView host + copies Anny GLBs into apps/mobile/assets/vitals-lab-host/.
 * Run before release iOS builds (adds ~1MB to the app, removes Next.js round-trip for 3D).
 */
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const outDir = path.join(mobileRoot, "assets/vitals-lab-host");
const meshSrc = path.resolve(
  mobileRoot,
  "../../apps/web/public/bodies/anny/meshes",
);
const meshDest = path.join(outDir, "bodies/anny/meshes");

fs.mkdirSync(meshDest, { recursive: true });
for (const name of ["female.glb", "male.glb"]) {
  fs.copyFileSync(path.join(meshSrc, name), path.join(meshDest, name));
}

await esbuild.build({
  entryPoints: [path.join(mobileRoot, "vitals-lab-host/entry.tsx")],
  bundle: true,
  outfile: path.join(outDir, "bundle.js"),
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  minify: true,
  legalComments: "none",
  sourcemap: false,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});

console.log(`Vitals Lab host written to ${outDir}`);
