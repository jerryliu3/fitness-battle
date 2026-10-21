export const RELAY_COLORS = ['#f1c75b','#819486','#b8c8c0','#d8bc8d','#a5b7c9','#c2b6cc'];
export function crewRelay(members: readonly {id:string;name:string;value:number;sessions:number}[], target:number|null) {
  const rows=members.map(m=>({...m,value:Number.isFinite(m.value)?Math.max(0,m.value):0}));
  const total=rows.reduce((sum,m)=>sum+m.value,0),scale=Math.max(1,total,target??0);
  let offset=0;
  return {total,target,remaining:target==null?null:Math.max(0,target-total),finish:target==null?null:Math.min(1,target/scale),segments:rows.map((m,i)=>{
    const start=offset/scale;offset+=m.value;
    return {...m,start,fraction:m.value/scale,share:total?m.value/total:0,color:RELAY_COLORS[i%RELAY_COLORS.length]!};
  })};
}
