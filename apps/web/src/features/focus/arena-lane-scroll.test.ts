import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "focus.css",
);

describe("arena lane scroll styles", () => {
  it("reserves horizontal scroll for the host and custom vertical pan for the track", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toMatch(/\.focus-lane-scroll[\s\S]*touch-action:\s*pan-x/);
    expect(css).toMatch(/\.focus-lane-track[\s\S]*touch-action:\s*none/);
  });
});
