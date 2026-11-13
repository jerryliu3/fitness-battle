import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getImage } from "./image/route";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("vitals-pose preview route", () => {
  it("returns 404 off localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(
      (await POST(new Request("https://example.com/api/dev/vitals-pose/preview", { method: "POST" })))
        .status,
    ).toBe(404);
  });

  it("rejects missing bones", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await POST(
      new Request("http://localhost:3000/api/dev/vitals-pose/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("image route validates gender", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await getImage(
      new Request("http://127.0.0.1:3000/api/dev/vitals-pose/preview/image?gender=other"),
    );
    expect(res.status).toBe(400);
  });
});
