import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const shellPath = join(dirname(fileURLToPath(import.meta.url)), "phone-shell.tsx");
const focusCssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../features/focus/focus.css",
);

describe("phone shell tab chrome", () => {
  it("keeps tab panels and chrome on the pathname", () => {
    const source = readFileSync(shellPath, "utf8");
    expect(source).toMatch(/value=\{matched/);
    expect(source).toMatch(/goToTab/);
    expect(source).toMatch(/router\.push\(href\)/);
    expect(source).not.toMatch(/layoutId/);
    expect(source).not.toMatch(/tabChromeReady/);
    expect(source).not.toMatch(/setPressed/);
  });

  it("paints the active tab pill with CSS instead of motion layoutId", () => {
    const css = readFileSync(focusCssPath, "utf8");
    expect(css).toMatch(/phone-tab\[data-state="active"\]::before/);
  });
});
