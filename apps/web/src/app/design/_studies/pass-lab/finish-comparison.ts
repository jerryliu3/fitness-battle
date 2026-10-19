import {DEFAULT_FINISH_PALETTE,type FinishPalette} from "./finish-colors";
import { GLASS_CONCEPTS, type GlassConcept } from "./glass-concepts";
import { MATERIAL_CONCEPTS, type MaterialConcept } from "./material-concepts";

export const FINISHES = [
  {id:"tinted",name:"Uniform glass",line:"One even translucent tint. Gold and silver use the same opacity.",source:"Uniform glass"},
  {id:"amber",name:"Tinted glass",line:"The original Amber Capsule material, with its translucent body and polished highlights.",source:"Amber Capsule"},
  {id:"satin",name:"Satin glass",line:"The milky, softly shaded material from Frosted Pebble, on the locked capsule shape.",source:"Frosted Pebble"},
  {id:"glaze",name:"Fired glaze",line:"The smooth enamel material from Glazed Ceramic, on the locked capsule shape.",source:"Glazed Ceramic"},
] as const;
export type FinishId=typeof FINISHES[number]["id"];
export type CompareShape="pill"|"circle";
export const SHAPES=[{id:"pill",name:"Capsule"}] as const;
export function finishSpec(finish:FinishId,shape:CompareShape,opacity=.5,palette:FinishPalette=DEFAULT_FINISH_PALETTE):MaterialConcept{
  const name=`${FINISHES.find(f=>f.id===finish)!.name} · ${shape==="pill"?"Capsule":"Fine loop"}`;
  if(finish==="tinted"){
    const base=GLASS_CONCEPTS.find(g=>g.id===(shape==="pill"?"glass-clear":"glass-loop-fine"))!;
    const spec:GlassConcept={...base,name,shape,glass:{...base.glass,opacity,gold:palette.gold,silver:palette.silver,echo:.2,rim:1.1,edge:.7,ring:shape==="circle"?6:0,tall:false}};
    return spec;
  }
  const base=MATERIAL_CONCEPTS.find(c=>c.id===(finish==="amber"?"capsule":finish==="satin"?"frost":"ceramic"))!;
  return {...base,name,shape,palette,loopBand:shape==="circle"?6:undefined};
}
export const FINISH_BOARD=FINISHES.flatMap(f=>SHAPES.map(s=>({id:`${f.id}-${s.id}`,name:`${f.name} · ${s.name}`,spec:finishSpec(f.id,s.id)})));
