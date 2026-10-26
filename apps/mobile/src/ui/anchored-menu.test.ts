import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  Platform: { OS: "ios" },
  View: "View",
  Text: "Text",
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (v: unknown) => v, hairlineWidth: 1, absoluteFill: {} },
}));

import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";

let renderer: ReactTestRenderer;

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

function TestHarness({
  onRenderState,
}: {
  onRenderState?: (state: ReturnType<typeof useAnchoredMenu>) => void;
}) {
  const menu = useAnchoredMenu({ minWidth: 200, estimatedHeight: 250 });
  onRenderState?.(menu);

  return createElement(
    "View",
    null,
    createElement(
      AnchoredMenu,
      {
        open: menu.open,
        onClose: menu.close,
        menuLayout: menu.menuLayout,
        accessibilityLabel: "Close test menu",
      },
      createElement("Text", null, "Menu Content"),
    ),
  );
}

it("toggles and renders AnchoredMenu content", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let state!: ReturnType<typeof useAnchoredMenu>;

  await act(async () => {
    renderer = create(
      createElement(TestHarness, {
        onRenderState: (s) => {
          state = s;
        },
      }),
    );
  });

  expect(renderer.root.findAllByType("Text" as never)).toHaveLength(0);

  // Toggle open
  await act(async () => {
    state.toggle();
  });

  expect(state.open).toBe(true);
  expect(state.menuLayout).toEqual({ x: 16, y: 50, width: 200 });
  expect(renderer.root.findAllByType("Text" as never)).toHaveLength(1);

  // Close
  await act(async () => {
    state.close();
  });

  expect(state.open).toBe(false);
  expect(renderer.root.findAllByType("Text" as never)).toHaveLength(0);
});
