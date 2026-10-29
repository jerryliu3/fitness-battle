import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn(() => Promise.resolve()) }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: storage }));
vi.mock("react-native", () => ({ StyleSheet: { create: (value: unknown) => value }, View: "View", Text: "Text", Pressable: "Pressable", PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) } }));
vi.mock("react-native-svg", () => ({ Circle: "Circle", ClipPath: "ClipPath", Defs: "Defs", Ellipse: "Ellipse", G: "G", Line: "Line", LinearGradient: "LinearGradient", Mask: "Mask", Path: "Path", Pattern: "Pattern", Rect: "Rect", Stop: "Stop", Text: "SvgText" }));
vi.mock("./focus", () => ({ FocusSheet: "FocusSheet", f: {}, useFocusStyles: () => ({}) }));
import { FieldOverview, useFieldAppearance, drawFieldNode } from "./field-course";
import { fieldAppearanceKey } from "@fitness-battle/shared";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.clearAllMocks(); });
function Harness({ account = "a" }: { account?: string }) { const [value, update] = useFieldAppearance(account, "running"); return createElement("Preference", { value, update }); }
describe("native field preferences and overview", () => {
  it("ignores stale hydration after a user edit or account switch", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const pending: ((raw: string | null) => void)[] = [];
    storage.getItem.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    await act(async () => { renderer = create(createElement(Harness)); });
    await act(async () => renderer.root.findByType("Preference" as never).props.update({ ground: "pool", edges: "open" }));
    await act(async () => pending[0]('{"ground":"night"}'));
    expect(renderer.root.findByType("Preference" as never).props.value.ground).toBe("pool");
    expect(storage.setItem).toHaveBeenCalledWith(fieldAppearanceKey("a", "running"), '{"ground":"pool","edges":"open"}');
    await act(async () => renderer.update(createElement(Harness, { account: "b" })));
    expect(renderer.root.findByType("Preference" as never).props.value.ground).toBe("trail");
    await act(async () => pending[1]('{"ground":"boardwalk","edges":"club"}'));
    expect(renderer.root.findByType("Preference" as never).props.value.ground).toBe("boardwalk");
  });
  it("maps native touches and accessibility actions to actual accumulated distance", async () => {
    const navigate = vi.fn();
    await act(async () => { renderer = create(createElement(FieldOverview, { lanes: [{ id: "me", name: "Me", initials: "ME", value: 20, you: true }], view: { center: 10, span: 6 }, unit: "km", onNavigate: navigate })); });
    const map = () => renderer.root.findAllByType("View" as never).find(node => node.props.accessibilityRole === "adjustable")!;
    await act(async () => map().props.onLayout({ nativeEvent: { layout: { width: 200 } } }));
    await act(async () => map().props.onPanResponderGrant({ nativeEvent: { locationX: 50 } }));
    expect(navigate).toHaveBeenLastCalledWith(5);
    await act(async () => map().props.onPanResponderMove({}, { dx: 100 }));
    expect(navigate).toHaveBeenLastCalledWith(15);
    await act(async () => map().props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }));
    expect(navigate).toHaveBeenLastCalledWith(11.5);
  });
  it("uses native SVG primitives and preserves label contents", () => {
    const node = drawFieldNode({ tag: "text", attrs: { x: 10 }, text: "20 km" }, 0) as { type: unknown; props: { children: unknown } };
    expect(node.type).toBe("SvgText");
    expect(node.props.children).toBe("20 km");
  });
});
