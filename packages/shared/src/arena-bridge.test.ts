import { describe, it, expect } from "vitest";
import { parseArenaSceneMessage } from "./arena-bridge";
const message = {
  type: "arena-view",
  lanes: [{ id: "me", name: "You", initials: "YL", value: 12, you: true }],
  view: { center: 12, span: 6 },
  selected: "me",
  unit: "km",
};
describe("embedded arena presentation bridge", () => {
  it("carries public portrait URLs without accepting credentials or script URLs",()=>{
    const withPortrait=(avatarUrl:string)=>parseArenaSceneMessage({...message,lanes:[{...message.lanes[0],avatarUrl}]})?.lanes[0]?.avatarUrl;
    expect(withPortrait("https://example.com/avatar.jpg")).toBe("https://example.com/avatar.jpg");
    expect(withPortrait("javascript:alert(1)")).toBeNull();expect(withPortrait("https://user:secret@example.com/a.jpg")).toBeNull();
  });
  it("keeps real distances and independent viewport bounds", () => {
    expect(parseArenaSceneMessage(message)?.lanes[0]?.value).toBe(12);
    expect(
      parseArenaSceneMessage({ ...message, view: { center: 500, span: 100 } })
        ?.view.center,
    ).toBe(500);
    expect(parseArenaSceneMessage({ ...message, unit: "mi" })?.unit).toBe("mi");
  });
  it("rejects non-finite values, unbounded payloads and duplicate identities", () => {
    expect(
      parseArenaSceneMessage({
        ...message,
        lanes: [{ ...message.lanes[0], value: NaN }],
      }),
    ).toBeNull();
    expect(
      parseArenaSceneMessage({
        ...message,
        lanes: Array(40).fill(message.lanes[0]),
      }),
    ).toBeNull();
    expect(
      parseArenaSceneMessage({
        ...message,
        lanes: [...message.lanes, ...message.lanes],
      }),
    ).toBeNull();
    expect(
      parseArenaSceneMessage({
        ...message,
        view: { center: Infinity, span: 6 },
      }),
    ).toBeNull();
  });
  it("does not accept scene commands or silently invent an athlete", () => {
    expect(
      parseArenaSceneMessage({ ...message, type: "delete-account" }),
    ).toBeNull();
    expect(parseArenaSceneMessage({ ...message, lanes: [] })).toBeNull();
    expect(
      parseArenaSceneMessage({ ...message, selected: "unknown" })?.selected,
    ).toBe("me");
  });
});
