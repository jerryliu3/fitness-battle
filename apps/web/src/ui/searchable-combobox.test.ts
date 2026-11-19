import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { CountryCombobox } from "./country-combobox";

let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

it("cancels a query without changing the saved value and selects with the keyboard", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onChange = vi.fn();
  await act(async () => { renderer = create(createElement(CountryCombobox, { value: "US", onChange })); });
  const input = () => renderer.root.findByType("input");
  const type = (value: string) => act(async () => input().props.onChange({ currentTarget: { value } }));
  const key = (key: string) => act(async () => input().props.onKeyDown({
    key, nativeEvent: {}, preventDefault: vi.fn(), stopPropagation: vi.fn(),
  }));

  await type("zzzz");
  expect(renderer.root.findByProps({ role: "status" }).props.children).toBe("No matching countries");
  await key("Escape");
  expect(input().props.value).toBe("United States");
  expect(onChange).not.toHaveBeenCalled();

  await type("Canada");
  await key("ArrowDown");
  expect(input().props["aria-activedescendant"]).toBeTruthy();
  await key("Enter");
  expect(onChange).toHaveBeenCalledWith("CA");
  expect(input().props["aria-expanded"]).toBe(false);
});
