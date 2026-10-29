import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import {describe,it,expect} from "vitest";
import {polishedIconSvg,polishedEchoPose,polishedWakeLength,POLISHED_IDENTITY} from "@fitness-battle/shared";

const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve("next/package.json"))("sharp");
const root=new URL("../../../../../",import.meta.url);
describe("selected production capsule identity",()=>{
  for(const dark of [false,true])it(`matches the finalized ${dark?"black":"white"} study pixel for pixel`,async()=>{
    const theme=dark?"black":"white";
    const study=(await readFile(new URL(`docs/design-studies/the-pass/selected-capsule-${theme}.svg`,root),"utf8"))
      .replace(/style="transform:\s*translateY\(([^p]+)px\);\s*opacity:\s*([^;]+);[^"]*"/g,'transform="translate(0 $1)" opacity="$2"');
    const expected=await sharp(Buffer.from(study)).ensureAlpha().raw().toBuffer();
    const actual=await sharp(Buffer.from(polishedIconSvg({dark}))).ensureAlpha().raw().toBuffer();
    expect(actual.equals(expected)).toBe(true);
  });
  it("keeps four static fading echoes inside the tile with aligned endpoints",()=>{
    for(const fast of [false,true]){
      const poses=Array.from({length:4},(_,i)=>polishedEchoPose(fast,i));
      expect(poses.map(p=>p.opacity)).toEqual([.6,.48,.36,.24]);
      expect((fast?93:145)+POLISHED_IDENTITY.scale*(29+poses[3].offset)).toBeCloseTo(248);
      expect(poses[3].offset).toBe(polishedWakeLength(fast));
    }
  });
  it("flows in repeating cycles with a slower rival",()=>{
    for(const fast of [false,true])for(let i=0;i<4;i++){
      const duration=fast?1.15:1.32;
      expect(polishedEchoPose(fast,i,.37+duration).offset).toBeCloseTo(polishedEchoPose(fast,i,.37).offset);
    }
    expect(polishedEchoPose(false,0,.2).offset/polishedWakeLength(false)).toBeLessThan(polishedEchoPose(true,0,.2).offset/polishedWakeLength(true));
  });
});
