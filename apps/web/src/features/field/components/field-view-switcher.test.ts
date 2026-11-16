import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { FieldViewSwitcher } from "./field-view-switcher";

vi.mock("@/lib/haptics", () => ({ playCue: vi.fn() }));

function menuLabels(renderer: ReactTestRenderer) {
  return renderer.root
    .findAll((node) => node.type === "button" && node.props.role === "menuitemradio")
    .map((item) => item.props.children[1].props.children);
}

async function openMenu(renderer: ReactTestRenderer, label: string) {
  await act(async () => {
    renderer.root.findByProps({ "aria-label": `Field view: ${label}` }).props.onClick();
  });
}

it("opens a popover with 2D, 3D, and Timeline for geographic fields", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(createElement(FieldViewSwitcher, { value: "4d", event: "running", onChange }));
    });
    await openMenu(renderer, "3D");
    expect(menuLabels(renderer)).toEqual(["3D", "2D", "Timeline"]);
    const twoD = renderer.root.find(
      (node) => node.type === "button" && node.props.role === "menuitemradio" && node.props.children[1].props.children === "2D",
    );
    await act(async () => twoD.props.onClick());
    expect(onChange).toHaveBeenCalledWith("2d");

    await openMenu(renderer, "3D");
    const timeline = renderer.root.find(
      (node) => node.type === "button" && node.props.role === "menuitemradio" && node.props.children[1].props.children === "Timeline",
    );
    await act(async () => timeline.props.onClick());
    expect(onChange).toHaveBeenCalledWith("graph");

    await act(async () => renderer.update(createElement(FieldViewSwitcher, { value: "2d", event: "strength", onChange })));
    await openMenu(renderer, "2D");
    expect(menuLabels(renderer)).toEqual(["Timeline", "2D"]);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    vi.unstubAllGlobals();
  }
});

it("offers an optional standings row", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn(), onStandings = vi.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(createElement(FieldViewSwitcher, { value: "2d", event: "strength", onChange, standings: true, onStandings }));
    });
    await openMenu(renderer, "2D");
    const standings = renderer.root.find(
      (node) => node.type === "button" && node.props.role === "menuitemradio" && node.props.children[1].props.children === "Standings",
    );
    expect(standings?.props["aria-checked"]).toBe(true);
    await act(async () => standings!.props.onClick());
    expect(onStandings).toHaveBeenCalledOnce();
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    vi.unstubAllGlobals();
  }
});

it("uses the shared Recovery policy in the icon popover", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(FieldViewSwitcher, {
      event: "sleep", value: "graph", onChange: vi.fn(),
    })); });
    await openMenu(renderer, "Timeline");
    expect(menuLabels(renderer)).toEqual(["Timeline"]);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    vi.unstubAllGlobals();
  }
});
