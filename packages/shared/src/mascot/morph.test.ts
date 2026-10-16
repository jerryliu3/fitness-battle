import { describe, expect, it } from "vitest";
import { EMBER_REST, createEmberScene, emberContour, morphEmberContour, type EmberNode } from "./index";
import { EMBER_K_OUTLINE } from "./k-outline";

const flatten = (nodes: EmberNode[]): EmberNode[] => nodes.flatMap(n => [n, ...flatten(n.children ?? [])]);
const points = (path: string) => Array.from(path.matchAll(/([-\d.]+) ([-\d.]+)/g), m => [Number(m[1]), Number(m[2])]);
const cross = (a: number[], b: number[], c: number[]) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);

describe("Ember ↔ K surface", () => {
  it("preserves the original cubic artwork at rest and reaches the actual font glyph", () => {
    expect(morphEmberContour({ ...EMBER_REST }, 0)).toBe(emberContour({ ...EMBER_REST }));
    const glyph = points(morphEmberContour({ ...EMBER_REST }, 1));
    expect(glyph).toHaveLength(EMBER_K_OUTLINE.length);
    expect(new Set(glyph.map(p => p.join(",")))).toEqual(new Set(EMBER_K_OUTLINE.map(p => p.join(","))));
  });

  it("has consistent winding and no crossed edges through the entire reversible morph", () => {
    for (let step=1; step<=100; step++) {
      const path=morphEmberContour({ ...EMBER_REST }, step/100);
      expect(path).not.toMatch(/NaN|Infinity/);
      expect(path.endsWith(" Z")).toBe(true);
      const p=points(path), n=p.length;
      const area=p.reduce((sum,a,i)=>{ const b=p[(i+1)%n]; return sum+a[0]*b[1]-b[0]*a[1]; },0);
      expect(area).toBeGreaterThan(0);
      let crossed=false;
      for(let i=0;i<n && !crossed;i++) for(let j=i+2;j<n;j++) {
        if(i===0 && j===n-1) continue;
        const a=p[i], b=p[(i+1)%n], c=p[j], d=p[(j+1)%n];
        const intersects=cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0;
        if(intersects) { crossed=true; break; }
      }
      expect(crossed, `crossed edges at morph ${step/100}`).toBe(false);
    }
  });

  it("keeps the body opaque while depth, facial detail and gold resolve to the letter", () => {
    const scene=flatten(createEmberScene({ id:"morph-test", morph:1, shadow:false }));
    expect(scene.filter(n=>n.tag==="stop").every(n=>n.attrs.stopColor==="#fff9e9")).toBe(true);
    const body=scene.find(n=>n.tag==="path" && n.attrs.fill==="url(#ember-morph-test-gold)");
    expect(body?.attrs.opacity).toBeUndefined();
    expect(scene.find(n=>n.attrs.clipPath==="url(#ember-morph-test-body)")?.attrs.opacity).toBe(0);
    expect(morphEmberContour({ ...EMBER_REST }, NaN)).toBe(emberContour({ ...EMBER_REST }));
  });
});
