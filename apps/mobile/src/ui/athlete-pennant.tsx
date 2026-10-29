import { useThemeColors } from "../theme";
import { Circle, Defs, ClipPath, Image as SvgImage, G, Path, Rect, Text as SvgText } from "react-native-svg";
import { PERSON_ICON_PATH, type ArenaSceneLane } from "@fitness-battle/shared";
import { chartTextProps } from "./section";
import { SHELL_COLORS as c } from "../theme";

/** Fixed-size field nameplate and leader, in screen coordinates. */
export function AthletePennant({ lane: l, x, y, detail, prefix }: {
  lane: Pick<ArenaSceneLane, "name" | "you" | "avatarUrl">; x: number; y: number; detail: string; prefix: string;
}) {
  const c = useThemeColors();

  return <G>
                    <Path d={`M0 0 L${x+146/2} ${y>0?y:y+46}`} fill="none" stroke={c.secondary} strokeWidth={1.2}/>
                    <Rect x={x} y={y+2} width={146} height={46} rx={12} fill={c.ink} opacity={.1}/>
                    <Rect x={x} y={y} width={146} height={46} rx={12} fill={c.card} stroke={l.you?c.tennis:c.line}/>
                    <Circle cx={x+24} cy={y+23} r={16} fill={c.soft}/>
                    {l.avatarUrl?<><Defs><ClipPath id={`${prefix}-portrait`}><Circle cx={x+24} cy={y+23} r={16}/></ClipPath></Defs><SvgImage href={{uri:l.avatarUrl}} x={x+8} y={y+7} width={32} height={32} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${prefix}-portrait)`}/></>:<Path d={PERSON_ICON_PATH} transform={`translate(${x+14} ${y+13}) scale(.83)`} fill="none" stroke={c.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>}
                    <SvgText {...chartTextProps()} x={x+47} y={y+20}  fill={c.ink} >{l.you?"You":l.name.length>13?`${l.name.slice(0,12)}…`:l.name}</SvgText>
                    <SvgText {...chartTextProps()} x={x+47} y={y+35}  fill={c.muted}>{detail}</SvgText>
  </G>;
}
