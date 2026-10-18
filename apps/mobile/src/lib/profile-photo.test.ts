import { describe, expect, it } from "vitest";
import { decodePhoto } from "./profile-photo";
describe("native photo decoding", () => {
  it("preserves binary JPEG header bytes with and without padding", () => {
    expect([...new Uint8Array(decodePhoto("/9j/"))]).toEqual([255, 216, 255]);
    expect([...new Uint8Array(decodePhoto("/9g="))]).toEqual([255, 216]);
    expect([...new Uint8Array(decodePhoto("/w=="))]).toEqual([255]);
  });
  it("rejects malformed picker data", () => {
    expect(() => decodePhoto("bad!")).toThrow();
  });
});
