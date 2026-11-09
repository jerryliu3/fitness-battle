import { describe, expect, it, vi } from "vitest";
import React from "react";
import renderer, { act } from "react-test-renderer";
import { EntryPassSheet } from "./entry-pass-sheet";
import { purchasesBridge } from "../lib/entry-pass";

// Mock child components that might use contexts or native animations
vi.mock("../ui/focus", () => ({
  FocusSheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? React.createElement("FocusSheet", null, children) : null,
  FocusButton: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) =>
    React.createElement("FocusButton", { label, onPress, disabled }),
}));

vi.mock("../ui/section", () => ({
  AppText: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement("AppText", props, children),
}));

vi.mock("../theme", () => ({
  useThemeColors: () => ({
    card: "#fff",
    line: "#eee",
    accent: "#B7F255",
    ink: "#111",
    paper: "#fafafa",
  }),
}));

vi.mock("./compete-home-sections", () => ({
  CompeteIcon: ({ name }: { name: string }) => React.createElement("CompeteIcon", { name }),
}));

vi.mock("./legal-links", () => ({
  LegalLinks: () => React.createElement("LegalLinks"),
}));

describe("EntryPassSheet", () => {
  it("renders plans and triggers purchase on action", async () => {
    const purchaseSpy = vi.spyOn(purchasesBridge, "purchasePlan").mockResolvedValue({ success: true });
    const onClose = vi.fn();
    const onPurchased = vi.fn();

    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        React.createElement(EntryPassSheet, {
          open: true,
          onClose,
          onPurchased,
        })
      );
    });

    const button = root!.root.findByType("FocusButton" as never);
    expect(button.props.label).toContain("Subscribe — $9.99 / yr");

    await act(async () => {
      await button.props.onPress();
    });

    expect(purchaseSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "entry_pass_annual", priceUsd: 9.99 })
    );
    expect(onPurchased).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
