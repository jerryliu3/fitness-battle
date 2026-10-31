import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("./fitness-store", () => ({ serviceDb: () => ({ rpc: mock.rpc }) }));
import { fetchGarminFile } from "./garmin-record-store";
const item = { userId: "garmin-user", summaryId: "123-file", activityId: 123, fileType: "GPX", callbackURL: "https://apis.garmin.com/wellness-api/rest/activityFile?id=123&token=private" };
describe("single-use Garmin file downloads", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.unstubAllGlobals());
  it("caches original bytes before processing and reuses them on retry", async () => {
    let cached: unknown = null;
    mock.rpc.mockImplementation(async (name, args) => {
      if (name === "load_garmin_record") return { data: cached, error: null };
      if (name === "store_garmin_record") cached = args.p_payload;
      return { error: null };
    });
    const fetcher = vi.fn(async () => new Response('<gpx><trk><type>running</type><trkseg><trkpt lat="40" lon="-74"><time>2026-10-31T00:00:00Z</time></trkpt><trkpt lat="40.001" lon="-74"><time>2026-10-31T00:01:00Z</time></trkpt></trkseg></trk></gpx>'));
    vi.stubGlobal("fetch", fetcher);
    const first = await fetchGarminFile("owner", item);
    const second = await fetchGarminFile("owner", item);
    expect(first[0]).toMatchObject({ id: "garmin-123", externalId: "123", provider: "garmin", verified: true });
    expect(first[0].detailedPolyline).toBeTruthy();
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(item.callbackURL, expect.objectContaining({ redirect: "error" }));
    expect(cached).toHaveProperty("base64");
  });
  it("does not follow an untrusted callback", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(fetchGarminFile("owner", { ...item, callbackURL: "https://example.com/file" })).rejects.toThrow("invalid_activity_file_url");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
