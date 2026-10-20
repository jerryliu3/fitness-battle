import {DEFAULT_FINISH_PALETTE,type FinishPalette} from "./finish-colors";
import { GLASS_CONCEPTS, type GlassConcept } from "./glass-concepts";
import { MATERIAL_CONCEPTS, type MaterialConcept } from "./material-concepts";

export const FINISHES = [
  {id:"satin",name:"Satin glass",line:"The milky, softly shaded material from Frosted Pebble, on the locked capsule shape.",source:"Frosted Pebble"},
  {id:"glaze",name:"Fired glaze",line:"The smooth enamel material from Glazed Ceramic, on the locked capsule shape.",source:"Glazed Ceramic"},
  {id:"rolled",name:"Rolled glass",line:"A soft white crest rolls into a shaded colored edge. The face stays evenly translucent.",source:"New · soft rolled rim"},
  {id:"bevel",name:"Polished glass",line:"A fine bright ridge inside a wider shaded bevel, inspired by a single Photos capsule.",source:"New · polished bevel"},
] as const;
const ARCHIVED_FINISHES = [
  {id:"tinted",name:"Uniform glass"},
  {id:"amber",name:"Tinted glass"},
  {id:"meniscus",name:"Liquid edge"},
] as const;
const ALL_FINISHES=[...FINISHES,...ARCHIVED_FINISHES];
export const FINISH_OPACITIES=[.26,.38,.5,.6,.7,.8,.9] as const;
export type FinishId=typeof FINISHES[number]["id"];
export const FINISH_SELECTION={id:"bevel",opacity:.8,goldId:"solar",silverId:"cool"} as const;
export type CompareShape="pill"|"circle";
export const SHAPES=[{id:"pill",name:"Capsule"}] as const;
export function finishSpec(finish:typeof ALL_FINISHES[number]["id"],shape:CompareShape,opacity=FINISH_SELECTION.opacity as number,palette:FinishPalette=DEFAULT_FINISH_PALETTE):MaterialConcept{
  const name=`${ALL_FINISHES.find(f=>f.id===finish)!.name} · ${shape==="pill"?"Capsule":"Fine loop"}`;
  if(finish==="tinted"||finish==="rolled"||finish==="bevel"||finish==="meniscus"){
    const base=GLASS_CONCEPTS.find(g=>g.id===(shape==="pill"?"glass-clear":"glass-loop-fine"))!;
    const spec:GlassConcept={...base,name,shape,glass:{...base.glass,opacity,gold:palette.gold,silver:palette.silver,echo:.2,rim:1.1,edge:.7,ring:shape==="circle"?6:0,tall:false,rimStyle:finish==="tinted"?undefined:finish}};
    return spec;
  }
  const base=MATERIAL_CONCEPTS.find(c=>c.id===(finish==="amber"?"capsule":finish==="satin"?"frost":"ceramic"))!;
  return {...base,name,shape,palette,loopBand:shape==="circle"?6:undefined};
}
export const FINISH_BOARD=FINISHES.flatMap(f=>SHAPES.map(s=>({id:`${f.id}-${s.id}`,name:`${f.name} · ${s.name}`,spec:finishSpec(f.id,s.id)})));
