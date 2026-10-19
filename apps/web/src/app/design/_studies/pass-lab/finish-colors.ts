export const GOLD_COLORS = [
  {id:"rich",name:"Rich gold",hex:"#dfad3c"},
  {id:"electric",name:"Electric yellow",hex:"#ffd600"},
  {id:"solar",name:"Solar gold",hex:"#ffc400"},
  {id:"marigold",name:"Marigold",hex:"#ffb900"},
  {id:"champagne",name:"Champagne",hex:"#f3d58b"},
  {id:"citrine",name:"Citrine",hex:"#f6d344"},
  {id:"honey",name:"Honey",hex:"#ecaa14"},
  {id:"amber",name:"Amber",hex:"#e59a16"},
  {id:"metallic",name:"Metallic gold",hex:"#d6a22e"},
  {id:"pale",name:"Pale gold",hex:"#ffe6a3"},
] as const;
export const SILVER_COLORS = [
  {id:"silver",name:"Current silver",hex:"#9fa5af"},
  {id:"platinum",name:"Bright platinum",hex:"#dde3ea"},
  {id:"pearl",name:"Pearl white",hex:"#eff2f6"},
  {id:"cool",name:"Cool platinum",hex:"#c9d6e3"},
  {id:"chrome",name:"Chrome",hex:"#b9c3ce"},
  {id:"sterling",name:"Sterling",hex:"#b7bdc6"},
  {id:"warm",name:"Warm platinum",hex:"#d8d2c6"},
  {id:"blue",name:"Blue silver",hex:"#a6bdd5"},
  {id:"smoke",name:"Smoke silver",hex:"#858f9e"},
  {id:"ice",name:"Ice platinum",hex:"#d5ecf4"},
] as const;
export type FinishPalette={gold:string;silver:string};
export const DEFAULT_FINISH_PALETTE:FinishPalette={gold:GOLD_COLORS[0].hex,silver:SILVER_COLORS[0].hex};
export function mixColor(color:string,target:string,amount:number){
  return '#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*(1-amount)+parseInt(target.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join('');
}
