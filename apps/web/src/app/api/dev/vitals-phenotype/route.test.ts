import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const PHENOTYPE_FILE = path.resolve(
  process.cwd(),
  "../../body-pipeline/local/phenotype.json",
);

beforeEach(async () => {
  await rm(PHENOTYPE_FILE, { force: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("vitals-phenotype dev route", () => {
  it("returns 404 off localhost development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(
      (await GET(new Request("https://example.com/api/dev/vitals-phenotype"))).status,
    ).toBe(404);
  });

  it("GET returns defaults on localhost in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await GET(new Request("http://localhost:3000/api/dev/vitals-phenotype"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.male.height).toBe(0.54);
    expect(json.regen).toContain("bodies:generate");
  });

  it("POST saves on localhost in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await POST(
      new Request("http://127.0.0.1:3000/api/dev/vitals-phenotype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ male: { height: 0.6 } }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.male.height).toBe(0.6);
  });
});
