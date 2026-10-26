import { describe, expect, it } from "vitest";
import { polishedCapsuleScene, type CapsuleNode } from "./polished-identity";
const flatten = (nodes: CapsuleNode[]): CapsuleNode[] => nodes.flatMap(n => [n, ...flatten(n.children ?? [])]);
describe("field capsule without a wake", () => {
  it.each([false, true])("keeps the same head and drops wake masks for gold=%s", gold => {
    const full = polishedCapsuleScene("racer", gold, 1);
    const head = polishedCapsuleScene("racer", gold, undefined, false, false);
    expect(head.slice(2)).toEqual(full.slice(2));
    expect(flatten(head).filter(n => n.tag === "mask")).toHaveLength(0);
    expect(head[1].children).toBeUndefined();
    expect(head).toEqual(polishedCapsuleScene("racer", gold, 2, false, false));
    expect(flatten(full).filter(n => n.tag === "mask")).toHaveLength(2);
  });
});
