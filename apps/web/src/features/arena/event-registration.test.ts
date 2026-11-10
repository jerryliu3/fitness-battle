import { createElement, type ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
vi.mock("motion/react", () => ({ motion: { div: "div" }, AnimatePresence: ({ children }: { children: ReactNode }) => children, useReducedMotion: () => true }));
vi.mock("./event-home", () => ({ CompeteIcon: () => null, EventArt: () => null }));
vi.mock("@/ui/wave-countdown", () => ({ WaveCountdown: () => null }));
import { EventRegistration } from "./event-registration";
it("does not show a confirmed entry until registration succeeds, and permits retry after failure", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const props = { state: freshState(), event: "strength" as const, registered: false, busy: false, error: "", onClaim: vi.fn(), onView: vi.fn() };
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(EventRegistration, props)); });
  try {
    for (let i = 0; i < 2; i++) await act(async () => tree.root.findAllByType("button").find(node => node.children.includes("Continue"))!.props.onClick());
    await act(async () => tree.root.findAllByType("button").find(node => node.children.includes("Claim your spot"))!.props.onClick());
    expect(props.onClaim).toHaveBeenCalledOnce();
    expect(tree.root.findByProps({ className: "registration-ticket" }).props["data-claimed"]).toBe(false);
    await act(async () => tree.update(createElement(EventRegistration, { ...props, error: "Could not save" })));
    expect(tree.root.findAllByType("button").find(node => node.children.includes("Claim your spot"))!.props.disabled).toBe(false);
    await act(async () => tree.update(createElement(EventRegistration, { ...props, registered: true })));
    expect(tree.root.findByProps({ className: "registration-ticket" }).props["data-claimed"]).toBe(true);
  } finally { await act(async () => tree.unmount()); vi.unstubAllGlobals(); }
});
