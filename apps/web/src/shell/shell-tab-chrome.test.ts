import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = join(dirname(fileURLToPath(import.meta.url)), "shell.css");

describe("phone tab chrome", () => {
  it("rounds the bottom tab bar to match the phone frame", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toMatch(/\.phone-tabs[\s\S]*border-radius:\s*0 0 28px 28px/);
  });
});
