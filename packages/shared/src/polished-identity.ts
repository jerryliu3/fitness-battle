/** Selected identity. Pure vector data shared by DOM, native SVG and asset generation. */
export const POLISHED_IDENTITY={scale:1.625,alpha:.8,gold:"#ffc400",platinum:"#c9d6e3",echoes:4,endpoint:248} as const;
export type CapsuleNode={tag:"g"|"defs"|"path"|"rect"|"linearGradient"|"stop"|"mask";attrs:Record<string,string|number>;children?:CapsuleNode[]};
const n=(tag:CapsuleNode["tag"],attrs:CapsuleNode["attrs"],children?:CapsuleNode[]):CapsuleNode=>({tag,attrs,children});
export function polishedCapsulePath(inset=0){const w=20-inset,h=29-inset;return `M${-w} ${-h+w}a${w} ${w} 0 0 1 ${2*w} 0V${h-w}a${w} ${w} 0 0 1 ${-2*w} 0Z`;}
export function polishedWakeLength(fast:boolean){return (POLISHED_IDENTITY.endpoint-(fast?93:145))/POLISHED_IDENTITY.scale-29;}
/** Same marker sizes as the finalized matching lane study. */
export function polishedLaneScale(you:boolean){return (you?17:14)/23*(POLISHED_IDENTITY.scale/1.35);}
export function polishedWakeDuration(fast:boolean){return fast?1.15:1.32;}
export function polishedEchoPose(fast:boolean,index:number,time?:number){
  const length=polishedWakeLength(fast),duration=polishedWakeDuration(fast),count=POLISHED_IDENTITY.echoes;
  if(time===undefined)return {offset:length*(index+1)/count,opacity:.6*(1-index/(count+1))};
  const phase=((Math.max(0,time)/duration+index/count)%1);
  return {offset:length*phase,opacity:.8-(.8-.12)*phase};
}
const darken=(color:string)=>'#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*.62).toString(16).padStart(2,'0')).join('');

/** Coordinates are local to the live head center. time is seconds; omit for the selected still. */
export function polishedCapsuleScene(id:string,fast:boolean,time?:number,monochrome=false,showWake=true):CapsuleNode[]{
  const color=monochrome?"#000000":fast?POLISHED_IDENTITY.gold:POLISHED_IDENTITY.platinum;
  const length=polishedWakeLength(fast),url=(key:string)=>`url(#${id}-${key})`;
  const stop=(offset:number,paint:string,opacity:number)=>n("stop",{offset,stopColor:paint,stopOpacity:opacity});
  const gradient=(key:string,stops:CapsuleNode[],x1=0,x2=1)=>n("linearGradient",{id:`${id}-${key}`,x1,y1:0,x2,y2:1},stops);
  const defs=n("defs",{},[
    ...(showWake ? [gradient("fade",[stop(0,"white",1),stop(1,"white",.35)],0,0)] : []),
    gradient("edge",[stop(0,"white",.7),stop(.38,"white",.08),stop(.7,color,.4),stop(1,"white",.455)],.05,.9),
    gradient("bevel",[stop(0,"white",.94),stop(.24,"white",.8),stop(.48,color,.08),stop(.74,darken(color),.44),stop(1,"white",.4)],.12,.84),
    gradient("crest",[stop(0,"white",.95),stop(.4,"white",.45),stop(.7,"white",0),stop(1,"white",.5)],0,.65),
    ...(showWake ? [n("mask",{id:`${id}-outside`,maskUnits:"userSpaceOnUse",maskType:"luminance",x:-40,y:-40,width:80,height:length+90},[
      n("rect",{x:-40,y:-40,width:80,height:length+90,fill:"white"}),
      n("path",{d:polishedCapsulePath(),fill:"black",stroke:"black",strokeWidth:2.2}),
    ]),
    n("mask",{id:`${id}-fade-mask`,maskUnits:"userSpaceOnUse",x:-35,y:-35,width:70,height:length+75},[
      n("rect",{x:-35,y:-29,width:70,height:length+59,fill:url("fade")}),
    ])] : []),
  ]);
  const echoes=showWake ? Array.from({length:POLISHED_IDENTITY.echoes},(_,i)=>{const pose=polishedEchoPose(fast,i,time);return n("g",{transform:`translate(0 ${pose.offset})`,opacity:pose.opacity},[
    n("path",{d:polishedCapsulePath(),fill:color,opacity:.55,stroke:color,strokeWidth:1.2}),
  ]);}) : [];
  const wake=showWake ? n("g",{mask:url("outside")},[n("g",{mask:url("fade-mask")},echoes)]) : n("g",{});
  const rim=(inset:number,paint:string,width:number,opacity=1)=>n("path",{d:polishedCapsulePath(inset),fill:"none",stroke:paint,strokeWidth:width,strokeOpacity:opacity});
  const head=monochrome?[n("path",{d:polishedCapsulePath(),fill:color})]:[
    n("path",{d:polishedCapsulePath(),fill:color,fillOpacity:POLISHED_IDENTITY.alpha,fillRule:"evenodd"}),
    rim(0,color,1.1,.65),rim(.7,url("edge"),1.1),
    rim(.25,color,.8,.35),rim(1.25,url("bevel"),2.1),rim(2,url("crest"),.85),
  ];
  return [defs,wake,...head];
}

const escapeXml=(value:string|number)=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export function capsuleNodeXml(node:CapsuleNode):string{
  const attrs=Object.entries(node.attrs).map(([key,value])=>{
    const name=["maskUnits","gradientUnits","viewBox"].includes(key)?key:key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
    return ` ${name}="${escapeXml(value)}"`;
  }).join('');
  return `<${node.tag}${attrs}>${(node.children??[]).map(capsuleNodeXml).join('')}</${node.tag}>`;
}
export function polishedIconSvg({dark=false,transparent=false,padded=false,monochrome=false}: {dark?:boolean;transparent?:boolean;padded?:boolean;monochrome?:boolean}={}){
  const background=transparent?'':`<rect width="256" height="256" fill="${dark?'#000000':'#ffffff'}"/>`;
  const art=[[74,145,false],[182,93,true]].map(([x,y,fast],i)=>`<g transform="translate(${x} ${y}) scale(${POLISHED_IDENTITY.scale})">${polishedCapsuleScene(`capsule-${i}`,Boolean(fast),undefined,monochrome).map(capsuleNodeXml).join('')}</g>`).join('');
  const transform=padded?' transform="translate(128 128) scale(.72) translate(-128 -150)"':'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 256 256" role="img" aria-label="Overtaek polished glass capsules with four fading echoes">${background}<g${transform}>${art}</g></svg>`;
}
