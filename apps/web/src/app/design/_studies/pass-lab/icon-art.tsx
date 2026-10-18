import { useId, type CSSProperties } from "react";
import { EMBER_MODEL } from "@fitness-battle/shared/mascot";
import { ICONS, iconColors, type Appearance, type IconId, type Mask } from "./catalog";

// Canonical Ember contour, deliberately flattened for icon-scale recognition.
const emberPath = `M ${EMBER_MODEL.start.join(" ")} ${EMBER_MODEL.body.map(s => `C ${s.join(" ")}`).join(" ")} Z`;
export function EmberSilhouette({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  return <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 300}) translate(-30 -48)`}><path d={emberPath} fill={color} /></g>;
}

export function IconArt({ id, appearance = "original", mask = "squircle", phase = 1, size, unmasked = false, className, style }: { id: IconId; appearance?: Appearance; mask?: Mask; phase?: number; size?: number; unmasked?: boolean; className?: string; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, "");
  const concept = ICONS.find(c => c.id === id) ?? ICONS[0];
  const { bg, fg, rival } = iconColors(concept, appearance);
  const p = Math.max(0, Math.min(1, phase));
  const lead = 163 - p * 66, other = 133 + p * 10;
  const line = (x: number, y: number, bottom: number, color: string, width: number, opacity = 1) => <path d={`M${x} ${y}V${bottom}`} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} />;
  const circle = (x: number, y: number, r: number, color: string) => <circle cx={x} cy={y} r={r} fill={color} />;
  const spark = (x: number, y: number, color: string) => <path d={`M${x} ${y - 32}Q${x + 6} ${y - 6} ${x + 29} ${y}Q${x + 6} ${y + 6} ${x} ${y + 32}Q${x - 6} ${y + 6} ${x - 29} ${y}Q${x - 6} ${y - 6} ${x} ${y - 32}Z`} fill={color} />;
  let art;
  switch (id) {
    case "twin-trails": art = <>{line(97, other, 209, rival, 11)}{line(166, lead, 209, fg, 11)}{circle(97, other, 23, rival)}{circle(166, lead, 23, fg)}</>; break;
    case "ember-pursuit": art = <>{line(89, other + 10, 211, rival, 7, .55)}{line(169, lead + 10, 211, fg, 9, .7)}{line(153, lead + 31, 190, fg, 3, .32)}<EmberSilhouette x={89} y={other} size={66} color={rival} /><EmberSilhouette x={169} y={lead} size={76} color={fg} /></>; break;
    case "slipstream": art = <><path d={`M68 ${other}C68 ${other - 34} 113 ${other - 34} 113 ${other}C113 177 87 197 72 214C87 178 68 172 68 ${other}Z`} fill={rival} /><path d={`M137 ${lead}C137 ${lead - 39} 189 ${lead - 39} 189 ${lead}C189 155 158 174 142 214C151 156 137 152 137 ${lead}Z`} fill={fg} /></>; break;
    case "photo-line": art = <><path d="M49 118H207" stroke={rival} strokeWidth="2" opacity=".5" /><path d="M49 110v16m158-16v16" stroke={rival} strokeWidth="3" />{line(94, other, 208, rival, 8, .5)}{line(164, lead, 208, fg, 8)}{circle(94, other, 21, rival)}{circle(164, lead, 24, fg)}<path d="M155 57h18" stroke={fg} strokeWidth="3" /></>; break;
    case "lane-cut": art = <><rect x="54" y="43" width="148" height="174" rx="38" fill={fg} /><path d={`M94 220V${other - 22}M162 220V${lead - 22}`} fill="none" stroke={bg} strokeWidth="24" strokeLinecap="round" /></>; break;
    case "afterimage": art = <>{[48, 31, 15, 0].map((dy, i) => <g key={dy} fill="none" strokeWidth={i === 3 ? 9 : 4} opacity={[.16, .3, .55, 1][i]}><circle cx="88" cy={other + dy} r="23" stroke={rival} /><circle cx="168" cy={lead + dy} r="23" stroke={fg} /></g>)}</>; break;
    case "pulse-stitch": art = <>{[0, 1].map(i => { const x = i ? 166 : 92, y = i ? lead : other, color = i ? fg : rival; return <g key={i}><rect x={x - 18} y={y - 25} width="36" height="50" rx="18" fill={color} />{[39, 59, 79].filter(d => y + d < 219).map(d => <path key={d} d={`M${x} ${y + d}v8`} stroke={color} strokeWidth="8" strokeLinecap="round" opacity=".65" />)}</g>; })}</>; break;
    case "paper-darts": art = <>{[0, 1].map(i => { const x = i ? 165 : 90, y = i ? lead : other, color = i ? fg : rival; return <g key={i}>{line(x, y + 18, 211, color, 4, .55)}<path d={`M${x} ${y - 32}L${x + 26} ${y + 24}L${x} ${y + 10}L${x - 26} ${y + 24}Z`} fill={color} /><path d={`M${x} ${y - 20}V${y + 10}L${x + 26} ${y + 24}`} fill="none" stroke={bg} strokeWidth="2.5" opacity=".6" /></g>; })}</>; break;
    case "elastic-sparks": art = <>{line(91, other + 10, 211, rival, 6)}{line(169, lead + 10, 211, fg, 7)}{spark(91, other, rival)}{spark(169, lead, fg)}</>; break;
    case "little-rivals": art = <>{[0, 1].map(i => { const x = i ? 169 : 88, y = i ? lead : other, color = i ? fg : rival; return <g key={i}>{line(x - 5, y + 35, 212, color, 5, .5)}{line(x + 9, y + 46, 200, color, 3, .4)}<rect x={x - 26} y={y - 27 + 5} width="52" height="66" rx="26" fill="#282f2c" opacity=".22" /><rect x={x - 26} y={y - 27} width="52" height="66" rx="26" fill={color} /><path d={`M${x - 8} ${y - 1}v5m15-5v5`} stroke={i ? "#282f2c" : bg} strokeWidth="4" strokeLinecap="round" /><path d={`M${x - 6} ${y + 16}q6 5 12 0`} fill="none" stroke={i ? "#282f2c" : bg} strokeWidth="2.5" strokeLinecap="round" /></g>; })}</>; break;
    case "open-track": art = <><path d="M51 50v156M128 50v156M205 50v156" fill="none" stroke={fg} strokeWidth="3" opacity=".34" /><path d="M47 204h162" stroke={fg} strokeWidth="3" />{circle(90, other, 22, rival)}{circle(166, lead, 22, fg)}</>; break;
    case "pass-notch": art = <><path d={`M54 205V${other - 10}a37 37 0 0 1 74 0v61H103v-61a12 12 0 0 0-24 0V205Z`} fill={rival} /><path d={`M128 179V${lead - 13}a37 37 0 0 1 74 0v113h-25V${lead - 13}a12 12 0 0 0-24 0V179Z`} fill={fg} /></>; break;
    case "ot": art = <><path d="M49 141a36 36 0 0 1 72 0v24a36 36 0 0 1-72 0Zm22 0v24a14 14 0 0 0 28 0v-24a14 14 0 0 0-28 0" fill={fg} fillRule="evenodd" /><path d="M117 60h95v23h-35v104h-25V83h-35Z" fill={fg} /></>; break;
    case "passing-o": art = <><path d="M171 65a71 71 0 1 0 18 111" stroke={fg} strokeWidth="24" strokeLinecap="round" fill="none" /><path d="M157 146V54m-17 17 17-17 17 17" stroke={rival} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>; break;
    case "club-stamp": art = <g stroke={fg} strokeWidth="13" strokeLinecap="square" strokeLinejoin="round" fill="none"><path d="M54 75a17 17 0 0 1 34 0v21a17 17 0 0 1-34 0Zm52-18 17 56 17-56M86 145h44m-22 0v56m45-56v56m32-56-32 29 34 27" /></g>; break;
  }
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} className={className} style={style} role="img" aria-label={`${concept.name} app icon`}>
    <defs><clipPath id={`${uid}-clip`}>{mask === "circle" ? <circle cx="128" cy="128" r="128" /> : <rect width="256" height="256" rx="57" />}</clipPath></defs>
    <g clipPath={unmasked ? undefined : `url(#${uid}-clip)`}><rect width="256" height="256" fill={bg} />{art}</g>
  </svg>;
}
