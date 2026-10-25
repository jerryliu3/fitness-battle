import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { files, cssFiles } from "./ui-contract.config.mjs";
const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const postcss = require("postcss");
const forbidden = new Set(["fontSize", "fontWeight", "fontFamily", "lineHeight", "letterSpacing", "textTransform", "fontStyle"]);
let failures = 0;
function fail(file, line, text) { console.error(`${file}:${line}: ${text}`); failures++; }
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    const rawType = (ts.isPropertyAssignment(node) || ts.isJsxAttribute(node)) && forbidden.has(node.name.getText(source));
    const legacyHeading = ts.isPropertyAccessExpression(node) && /^f\.(h2|sectionTitle|title|copy|small|rowTitle)$/.test(node.getText(source));
    const rawHeading = (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && /^h[1-3]$/.test(node.tagName.getText(source));
    const unstyledNative = file.startsWith("apps/mobile/") && (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === "Text" && !node.attributes.properties.some(attribute => attribute.name?.getText(source) === "style");
    const arbitraryClass = ts.isJsxAttribute(node) && node.name.getText(source) === "className" && /\b(?:text-(?:xs|sm|base|lg|xl|\d+xl|\[(?:\d|calc|clamp|var))|font-(?:mono|thin|light|normal|medium|semibold|bold|black)|tracking-|uppercase|italic)/.test(node.getText(source));
    if (rawType || legacyHeading || rawHeading || arbitraryClass || unstyledNative) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      fail(file, line + 1, `use a shared semantic typography recipe instead of ${node.getText(source)}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const roles = "(?:display|heading|body|label|caption|hero|metric|row|value|support|field|nav)";
for (const file of cssFiles) {
  postcss.parse(fs.readFileSync(file, "utf8"), { from: file }).walkDecls(decl => {
    // Wordmarks are vector-like brand artwork, not a sixth product recipe.
    if (/wordmark|brand-logo|\bember\b|mascot/.test(decl.parent.selector ?? "")) return;
    let valid = true;
    if (decl.prop === "font") valid = decl.value === "inherit" || new RegExp(`^var\\(--type-${roles}\\)$`).test(decl.value);
    if (/^font-(size|weight)$|^line-height$/.test(decl.prop)) valid = new RegExp(`^var\\(--type-${roles}-(size|weight|leading)\\)$`).test(decl.value) || decl.value === "inherit";
    if (decl.prop === "font-family") valid = decl.value === 'var(--font-body), "Manrope", sans-serif' || decl.value === "inherit";
    if (decl.prop === "letter-spacing") valid = ["normal", "0", "inherit"].includes(decl.value) || new RegExp(`^var\\(--type-${roles}-tracking\\)$`).test(decl.value);
    if (decl.prop === "text-transform") valid = ["none", "inherit"].includes(decl.value);
    if (decl.prop === "font-style") valid = ["normal", "inherit"].includes(decl.value);
    if (!valid) fail(file, decl.source.start.line, `use a shared typography recipe: ${decl.toString()}`);
  });
}
const shared = fs.readFileSync("packages/shared/src/shell.ts", "utf8");
const contract = shared.match(/export const SHELL_TYPOGRAPHY\s*=\s*\{([\s\S]*?)\}\s*as const/);
if (!contract || [...contract[1].matchAll(/^  (\w+):/gm)].map(m => m[1]).sort().join() !== "body,caption,display,field,heading,hero,label,metric,nav,row,support,value") fail("packages/shared/src/shell.ts", 1, "keep the approved semantic typography roles");
if (failures) process.exitCode = 1;
else console.log(`UI contract: ${files.length} source files and ${cssFiles.length} stylesheets use the shared semantic typography library.`);
