import { PERSON_ICON_PATH, type ArenaSceneLane } from "@fitness-battle/shared";
import { typographyStyle } from "@/ui/section";

/** Fixed-size field nameplate and leader, in screen coordinates. */
export function AthletePennant({ lane: l, x, y, detail, prefix }: {
  lane: Pick<ArenaSceneLane, "name" | "you" | "avatarUrl">; x: number; y: number; detail: string; prefix: string;
}) {
  return <g>
                <path d={`M0 0 L${x+146/2} ${y>0?y:y+46}`} fill="none" stroke="#819486" strokeWidth="1.2"/>
                <rect x={x} y={y+2} width={146} height={46} rx={12} fill="#282f2c" opacity={.1}/>
                <rect x={x} y={y} width={146} height={46} rx={12} fill="#ffffff" stroke={l.you?"#f1c75b":"#e0e5dc"}/>
                <circle cx={x+24} cy={y+23} r={16} fill="#eef0e9"/>
                {l.avatarUrl ? <><defs><clipPath id={`${prefix}-portrait`}><circle cx={x+24} cy={y+23} r={16}/></clipPath></defs><image href={l.avatarUrl} x={x+8} y={y+7} width={32} height={32} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${prefix}-portrait)`}/></> : <path d={PERSON_ICON_PATH} transform={`translate(${x+14} ${y+13}) scale(.83)`} fill="none" stroke="#616c63" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>}
                <text style={typographyStyle("caption")} x={x+47} y={y+20}  fill="#282f2c" >{l.you?"You":l.name.length>13?`${l.name.slice(0,12)}…`:l.name}</text>
                <text style={typographyStyle("caption")} x={x+47} y={y+35}  fill="#616c63">{detail}</text>
  </g>;
}
