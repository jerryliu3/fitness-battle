import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
vi.mock("motion/react", () => ({ motion: { div: "div" }, useReducedMotion: () => true }));
vi.mock("./event-home", () => ({ CompeteIcon: () => null, EventArt: () => null }));
vi.mock("@/ui/wave-countdown", () => ({ WaveCountdown: () => null }));
import { EventRegistration } from "./event-registration";

it("renders the 2-step flow with field inside hero, flippable rule cards, and claim retry", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const props = { state: freshState(), event: "strength" as const, registered: false, busy: false, error: "", onClaim: vi.fn(), onView: vi.fn() };
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(EventRegistration, props)); });
  try {
    expect(tree.root.findAllByProps({ className: "registration-topbar" })).toHaveLength(0);
    const hero = tree.root.findByProps({ className: "registration-hero" });
    expect(hero.findByType("h2").props.children).toBe("Strength");
    expect(hero.findByProps({ className: "registration-mysteries" }).findAllByType("span")).toHaveLength(8);

    const ruleCards = tree.root.findAllByProps({ className: "registration-rule-card" });
    expect(ruleCards).toHaveLength(3);
    expect(ruleCards[0]!.props["data-flipped"]).toBe(false);
    await act(async () => ruleCards[0]!.props.onClick());
    expect(tree.root.findAllByProps({ className: "registration-rule-card" })[0]!.props["data-flipped"]).toBe(true);

    const stage = tree.root.findByProps({ className: "registration-stage" });
    expect(stage.children).toHaveLength(2);
    expect(stage.findByProps({ className: "registration-step" }).props["aria-hidden"]).toBe(false);
    expect(stage.findByProps({ className: "registration-ticket-scene registration-step" }).props["aria-hidden"]).toBe(true);

    await act(async () => tree.root.findAllByType("button").find(node => node.children.includes("Continue →"))!.props.onClick());
    expect(stage.findByProps({ className: "registration-step" }).props["aria-hidden"]).toBe(true);
    expect(stage.findByProps({ className: "registration-ticket-scene registration-step" }).props["aria-hidden"]).toBe(false);
    const ticket = tree.root.findByProps({ className: "registration-ticket" });
    expect(ticket.findAllByType("h2")[0]!.children.join("")).toBe("Your spot is ready.");
    expect(tree.root.findAllByProps({ className: "registration-ticket-note" })).toHaveLength(0);
    expect(ticket.findAllByProps({ className: "registration-ticket-sub" })).toHaveLength(1);

    await act(async () => tree.root.findAllByType("button").find(node => node.children.includes("Claim your spot"))!.props.onClick());
    expect(props.onClaim).toHaveBeenCalledOnce();
    expect(tree.root.findByProps({ className: "registration-ticket" }).props["data-claimed"]).toBe(false);

    await act(async () => tree.update(createElement(EventRegistration, { ...props, error: "Could not save" })));
    expect(tree.root.findAllByType("button").find(node => node.children.includes("Claim your spot"))!.props.disabled).toBe(false);

    await act(async () => tree.update(createElement(EventRegistration, { ...props, registered: true })));
    expect(tree.root.findByProps({ className: "registration-ticket" }).props["data-claimed"]).toBe(true);
  } finally { await act(async () => tree.unmount()); vi.unstubAllGlobals(); }
});

it("reuses the confirmed ticket without the registration walkthrough for onboarding", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onView = vi.fn();
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(EventRegistration, { state: freshState(), event: "running", registered: true, confirmationOnly: true, busy: false, error: "", onClaim: vi.fn(), onView })); });
  expect(tree.root.findAllByProps({ className: "registration-hero" })).toHaveLength(0);
  expect(tree.root.findByProps({ className: "registration-ticket" }).props["data-claimed"]).toBe(true);
  await act(async () => tree.root.findAllByType("button").find(n => n.props.children === "Continue")!.props.onClick());
  expect(onView).toHaveBeenCalledOnce();
  await act(async () => tree.unmount());
});
