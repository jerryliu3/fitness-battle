import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "focus.css",
);

describe("arena lane scroll styles", () => {
  it("allows horizontal pan on the scroll host while keeping vertical lane drag", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toMatch(/\.focus-lane-scroll[\s\S]*touch-action:\s*pan-x pan-y/);
    expect(css).toMatch(/\.focus-lane-track[\s\S]*touch-action:\s*pan-y/);
    expect(css).not.toMatch(/\.focus-lane-track[\s\S]*touch-action:\s*none/);
  });
});
