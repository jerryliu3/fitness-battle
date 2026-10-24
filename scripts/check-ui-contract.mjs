import fs from "node:fs";
import ts from "typescript";
import { files, exceptions } from "./ui-contract.config.mjs";
const forbidden = new Set(["fontSize", "fontWeight", "fontFamily", "lineHeight"]);
let failures = 0;
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const allowed = [...(exceptions[file] ?? [])];
  function visit(node) {
    const rawType = ts.isPropertyAssignment(node) && forbidden.has(node.name.getText(source));
    const legacyHeading = ts.isPropertyAccessExpression(node) && /^f\.(h2|sectionTitle)$/.test(node.getText(source));
    if (rawType || legacyHeading) {
      const text = node.getText(source);
      const exception = allowed.indexOf(text);
      if (exception >= 0) allowed.splice(exception, 1);
      else {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        console.error(`${file}:${line + 1}: use a semantic UI role instead of ${text}`);
        failures++;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (failures) process.exitCode = 1;
else console.log(`UI contract: ${files.length} migrated feature files passed.`);
