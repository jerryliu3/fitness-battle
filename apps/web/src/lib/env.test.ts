import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("web env module", () => {
  it("reads NEXT_PUBLIC_* with static property access for client inlining", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "env.ts"),
      "utf8",
    );
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(source).toContain("process.env.NEXT_PUBLIC_APP_URL");
    expect(source).toContain("process.env.NEXT_PUBLIC_USE_DEMO_DATA");
    // Dynamic lookups break Next client inlining for public env.
    const code = source
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("*") && !line.trimStart().startsWith("//"))
      .join("\n");
    expect(code).not.toMatch(/process\.env\[[^\]]+\]/);
  });
});
