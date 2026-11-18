import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ prototypes: {} as Record<string, unknown>, requireView: vi.fn(() => "NativePanel") }));
vi.mock("expo", () => ({ requireOptionalNativeModule: () => ({ ViewPrototypes: native.prototypes }), requireNativeView: native.requireView }));
vi.mock("react-native", () => ({ View: "View" }));
vi.mock("../theme", () => ({ useAppTheme: () => ({ mode: "dark", colors: { card: "#112233" } }) }));
afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });
it.each([false, true])("supports binaries with and without the named material view (available=%s)", async available => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  native.prototypes = available ? { AnchoredChoice_MaterialPanel: {} } : {};
  const { MaterialPanel } = await import("./material-panel.ios");
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(createElement(MaterialPanel, { style: { height: 124 } })); });
  if (available) {
    expect(native.requireView).toHaveBeenCalledWith("AnchoredChoice", "MaterialPanel");
    expect(renderer.root.findByType("NativePanel" as never).props.dark).toBe(true);
  } else {
    expect(native.requireView).not.toHaveBeenCalled();
    expect(renderer.root.findByType("View" as never).props.style).toContainEqual({ backgroundColor: "#11223366" });
  }
  await act(async () => renderer.unmount());
});
