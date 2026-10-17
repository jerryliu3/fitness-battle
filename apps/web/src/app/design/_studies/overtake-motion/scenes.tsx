"use client";

import { useId, type ReactNode } from "react";
import { Ember } from "@/components/mascot/ember";
import { between, clamp, ease, mix, out, pulse, rivals, runFrame, runMiles, stackedLayout, staggeredLogoFrame, startMiles, type Avatar, type Family, type Outcome } from "./concepts";

export interface SceneProps {
  family: Family;
  concept: string;
  progress: number;
  outcome: Outcome;
  avatar: Avatar;
  dark: boolean;
  reduced?: boolean;
  lockup?: "stacked" | "inline";
}

const green = "#d4ee89";
const ink = "#26382d";
const font = "'Nunito Sans', 'Arial Black', sans-serif";
const ui = "'DM Sans', Arial, sans-serif";

function Frame({ dark, label, children }: { dark: boolean; label: string; children: ReactNode }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 440" fill="none" role="img" aria-label={label} style={{ display: "block", width: "100%", height: "100%", fontFamily: ui }}>
    <title>{label}</title>
    <rect width="760" height="440" fill={dark ? ink : "#fafbf8"} />
    {children}
  </svg>;
}

function AvatarMark({ x, y, own, color = "#b8cbd7", initials, avatar, tilt = 0, scale = 1, dark }: { x: number; y: number; own?: boolean; color?: string; initials?: string; avatar: Avatar; tilt?: number; scale?: number; dark: boolean }) {
  return <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${scale})`}>
    <ellipse cy="32" rx="24" ry="5" fill={dark ? "#14251a" : "#26382d"} opacity=".13" />
    <circle r="29" fill={own ? green : color} stroke={own ? (dark ? "#edf9cf" : ink) : (dark ? "#26382d" : "#fff")} strokeWidth={own ? 3 : 4} />
    {own && avatar === "ember" ? <svg x="-24" y="-35" width="48" height="62" viewBox="0 0 360 485"><Ember shadow={false} expression="focused" /></svg>
      : own ? <g stroke={ink} strokeWidth="3.5" strokeLinecap="round"><path d="m-11-5 5 1m12 0 5-1" /><path d="M-5 9q5 4 10-1" /><path d="m-16-14 7-4m18 1 5 2" /></g>
        : <text textAnchor="middle" y="5" fontSize="15" fontWeight="800" fill={ink}>{initials}</text>}
  </g>;
}

function Spark({ x, y, r = 10, color = green, opacity = 1 }: { x: number; y: number; r?: number; color?: string; opacity?: number }) {
  return <path d={`M${x - r} ${y}q${r} 0 ${r} ${-r}q0 ${r} ${r} ${r}q-${r} 0 -${r} ${r}q0-${r}-${r}-${r}`} fill={color} opacity={opacity} />;
}

export function OvertakeScene({ progress: p, concept, outcome, avatar, dark, reduced }: Omit<SceneProps, "family">) {
  const uid = useId().replace(/:/g, "");
  const f = runFrame(p, concept, outcome);
  const foreground = dark ? "#f5f8f1" : ink;
  const muted = dark ? "#a8baa7" : "#768172";
  const line = dark ? "#53634d" : "#e0e5dd";
  const distanceX = (miles: number) => 115 + (miles - 12) * 86;
  const x = distanceX(f.miles);
  const moving = Math.sin(between(p, .2, .9) * Math.PI);
  const charging = Math.sin(between(p, .12, .28) * Math.PI);
  const passed = f.passed.length;
  const cinematic = concept === "photo" || concept === "photo-combo";
  const combo = concept === "combo" || concept === "photo-combo";
  const finish = out(between(p, .86, .98));
  const latestPass = [...f.passed].sort((a, b) => b.miles - a.miles)[0];
  const reward = latestPass ? pulse(f.miles, latestPass.miles + .2, .5) * (1 - finish) : 0;
  const firstCrossing = (13.8 - startMiles) / runMiles[outcome];
  const nearest = [...rivals].sort((a, b) => Math.abs(f.miles - a.miles) - Math.abs(f.miles - b.miles))[0];
  const closeup = reduced ? 0 : concept === "photo-combo" && outcome > 0 ? pulse(f.miles, nearest.miles, .65) : concept === "photo" && outcome > 0 ? pulse(f.travel, firstCrossing, .19) : 0;
  const camera = 1 + closeup * .52;
  const cameraX = concept === "photo-combo" ? distanceX(nearest.miles) : 380;
  const cameraY = concept === "photo-combo" ? (244 + nearest.y) / 2 : 244;
  const runLabel = p < .16 ? "A run just came in" : f.done ? passed ? `You moved up ${passed} ${passed === 1 ? "place" : "places"}` : "Every mile moves you forward" : "Making your move";
  return <Frame dark={dark} label={`${concept} overtake study. ${f.miles.toFixed(1)} miles, position ${f.rank}. ${passed} overtakes.`}>
    <defs>
      <linearGradient id={`${uid}-wake`}><stop stopColor={green} stopOpacity="0" /><stop offset="1" stopColor={green} stopOpacity=".6" /></linearGradient>
      <radialGradient id={`${uid}-glow`}><stop stopColor={green} stopOpacity=".23" /><stop offset="1" stopColor={green} stopOpacity="0" /></radialGradient>
      <clipPath id={`${uid}-clip`}><rect x="20" y="100" width="720" height="278" rx="15" /></clipPath>
    </defs>
    <circle cx="385" cy="250" r="230" fill={`url(#${uid}-glow)`} opacity={moving * .7} />
    <circle cx="34" cy="34" r="5" fill={dark ? green : ink} />
    <text x="49" y="39" fontSize="11" fill={muted} fontWeight="700" letterSpacing="1.4">WEEKLY RUNNING · SAMPLE FIELD</text>
    <text x="726" y="39" textAnchor="end" fontSize="11" fill={muted}>#1 Noor · 19.2 mi ↗</text>
    <text x="34" y="78" fontSize="26" fontWeight="700" letterSpacing="-.8" fill={foreground}>{runLabel}</text>
    <g clipPath={`url(#${uid}-clip)`}>
      <g transform={`translate(${cameraX * (1 - camera)} ${cameraY * (1 - camera)}) scale(${camera})`}>
        {[12, 13, 14, 15, 16, 17, 18].map(mile => <g key={mile}><line x1={distanceX(mile)} x2={distanceX(mile)} y1="110" y2="365" stroke={line} strokeWidth="1" strokeDasharray="2 8" opacity=".45" /><text x={distanceX(mile)} y="373" textAnchor="middle" fontSize="9" fill={muted}>{mile} mi</text></g>)}
        {[156, 244, 332].map(y => <g key={y}><rect x="25" y={y - 36} width="710" height="72" rx="16" fill={y === 244 ? (dark ? "#354b34" : "#eef5e3") : (dark ? "#2d4032" : "#f2f4ef")} /><line x1="105" x2="735" y1={y} y2={y} stroke={y === 244 ? (dark ? "#b6d678" : "#8eaa68") : line} strokeDasharray="4 7" opacity=".5" /><text x="42" y={y - 7} fontSize="12" fill={y === 244 ? foreground : muted} fontWeight="700">{y === 244 ? "YOU" : y === 156 ? "Jules" : "Mara"}</text><text x="42" y={y + 12} fontSize="10" fill={muted}>{y === 244 ? `#${f.rank}` : `#${(y === 156 ? 2 : 3) + (f.miles > (y === 156 ? 15.6 : 13.8) ? 1 : 0)}`}</text></g>)}
        {concept === "draft" && <path d={`M${x - 210} 258C${x - 100} 296 ${x - 94} 206 ${x - 24} 244L${x - 24} 259C${x - 104} 220 ${x - 95} 311 ${x - 210} 258Z`} fill={`url(#${uid}-wake)`} opacity={moving} />}
        {(concept === "dash" || cinematic || combo) && [0, 1, 2, 3, 4].map(i => <line key={i} x1={x - 33 - moving * (80 + i * 16)} x2={x - 33} y1={226 + i * 9} y2={226 + i * 9} stroke={green} strokeWidth={i === 2 ? 7 : 2} strokeLinecap="round" opacity={moving * (i === 2 ? .45 : .7)} />)}
        {rivals.map(rival => {
          const rx = distanceX(rival.miles);
          const impact = !reduced && outcome > 0 ? pulse(f.miles, rival.miles + .12, .42) : 0;
          const isPassed = f.miles > rival.miles;
          const ripple = clamp((f.miles - rival.miles) / .65);
          return <g key={rival.name}>
            {concept === "draft" && <path d={`M${rx - 135} ${rival.y}q75 ${-40 * impact} 140 0`} stroke={green} strokeWidth="3" opacity={impact} />}
            {cinematic && <g opacity={impact}><line x1={rx} x2={rx} y1="110" y2="366" stroke={foreground} strokeWidth="2" /><rect x={rx + 10} y="108" width="82" height="23" rx="4" fill={foreground} /><text x={rx + 51} y="124" textAnchor="middle" fill={dark ? ink : "#fff"} fontSize="10" fontWeight="700">THE PASS</text></g>}
            {isPassed && ripple < 1 && <circle cx={rx} cy={rival.y} r={32 + ripple * 38} stroke={combo ? "#f5c451" : green} strokeWidth={3 - ripple * 2} opacity={1 - ripple} />}
            <AvatarMark x={rx + (concept === "dash" ? Math.sin(impact * 23) * impact * 7 : 0)} y={rival.y} color={rival.color} initials={rival.initials} avatar={avatar} dark={dark} tilt={combo ? impact * -13 : 0} />
            <text x={rx + 41} y={rival.y + 4} fontSize="11" fill={muted}>{rival.miles.toFixed(1)} mi</text>
            {combo && isPassed && <Spark x={rx - 40} y={rival.y - 14} r={9} color={green} opacity={1 - ripple} />}
          </g>;
        })}
        {concept === "dash" && <g opacity={charging}><circle cx={x} cy="244" r={35 + charging * 12} stroke={green} strokeWidth="2" /><path d={`m${x - 49} 235-14 10 9 2-8 11m${x + 45} 223 11 9-6 5 12 7`} stroke={green} strokeWidth="2" /></g>}
        <AvatarMark x={x - charging * 7} y={244} own avatar={avatar} dark={dark} tilt={reduced ? 0 : -moving * 10} scale={reduced ? 1 : 1 - charging * .1} />
        <rect x={x - 32} y="190" width="64" height="23" rx="11.5" fill={green} /><text x={x} y="206" fontSize="11" fontWeight="800" textAnchor="middle" fill={ink}>{f.miles.toFixed(1)} mi</text>
        {combo && passed > 0 && <g transform={`translate(${x + 35} 278)`}><rect x="-2" y="-18" width="69" height="25" rx="9" fill="#f5c451" /><text x="32" y="-1" textAnchor="middle" fill={ink} fontSize="12" fontWeight="900">×{passed} {passed > 1 ? "COMBO" : "PASS"}</text></g>}
      </g>
    </g>
    {combo && latestPass && <g opacity={reward}><rect x="520" y="52" width="206" height="34" rx="12" fill={green} /><text x="623" y="74" textAnchor="middle" fontSize="13" fontWeight="900" fill={ink}>+1 OVERTAKE · ×{passed}</text></g>}
    <g opacity={1 - finish}><rect x="34" y="397" width="135" height="27" rx="13.5" fill={dark ? "#3b5139" : "#e8efdd"} /><text x="101" y="415" fontSize="11" textAnchor="middle" fill={foreground}>+{runMiles[outcome].toFixed(1)} mi · run received</text><text x="726" y="415" textAnchor="end" fill={muted} fontSize="10">{p < .22 ? "A little effort. A little momentum." : "Same lanes. A new position."}</text></g>
    <g opacity={finish} transform={`translate(0 ${8 * (1 - finish)})`}>
      <text x="34" y="417" fontSize="13" fontWeight="700" fill={foreground}>{passed ? `#4 → #${f.rank}   ·   ${passed} ${passed === 1 ? "overtake" : "overtakes"}` : `#4   ·   +${runMiles[outcome].toFixed(1)} miles closer`}</text>
      {passed > 0 && <g><rect x="540" y="393" width="186" height="33" rx="16.5" fill={green} /><text x="633" y="414" fontSize="11" fontWeight="800" textAnchor="middle" fill={ink}>↗ {7 + passed} overtakes this week*</text></g>}
    </g>
  </Frame>;
}

function keyframe(p: number, points: [number, number][]) {
  for (let i = 1; i < points.length; i++) {
    if (p <= points[i][0]) return mix(points[i - 1][1], points[i][1], ease(between(p, points[i - 1][0], points[i][0])));
  }
  return points[points.length - 1][1];
}

function Word({ word, x, y, width, color, lean = 0, opacity = 1, size = 98, outline }: { word: string; x: number; y: number; width: number; color: string; lean?: number; opacity?: number; size?: number; outline?: string }) {
  return <g transform={`translate(${x} ${y}) skewX(${-lean})`} opacity={opacity}><text x="0" y="0" fill={color} fontFamily={font} fontWeight="900" fontSize={size} letterSpacing="-5" textLength={width} lengthAdjust="spacingAndGlyphs" stroke={outline} strokeWidth={outline ? 5 : 0} paintOrder="stroke" strokeLinejoin="round">{word}</text></g>;
}

export function LogoScene({ progress: p, concept, dark, reduced, lockup }: Omit<SceneProps, "family">) {
  const uid = useId().replace(/:/g, "");
  if (concept.startsWith("chase-")) return <StaggeredLogoScene progress={p} concept={concept} dark={dark} reduced={reduced} lockup={lockup} />;
  const color = dark ? "#f7faef" : ink;
  const accent = dark ? green : "#769d3e";
  const moving = Math.sin(between(p, .05, .91) * Math.PI);
  const final = ease(between(p, .74, .94));
  const enterOver = out(between(p, .02, .22));
  const enterTaek = out(between(p, .14, .35));
  let ox = keyframe(p, [[0, -270], [.22, 285], [.43, 305], [.76, 146], [1, 160]]);
  let tx = keyframe(p, [[0, -350], [.14, -350], [.36, 15], [.5, 148], [.73, 402], [.93, 368]]);
  let oy = 253, ty = 253, lean = 8 * moving;
  if (concept === "switch") {
    oy = mix(200, 253, final); ty = mix(303, 253, final); lean = mix(8 * moving, 8, final);
  }
  if (concept === "sling") {
    tx = keyframe(p, [[0, -350], [.3, 60], [.45, 12], [.7, 425], [.91, 368]]);
    ty -= Math.sin(between(p, .45, .85) * Math.PI) * 53;
    ox += Math.sin(between(p, .31, .8) * Math.PI) * 18;
    lean = mix(moving * 11, 5, final);
  }
  if (concept === "relay") { oy -= 12 * Math.sin(between(p, .48, .8) * Math.PI); lean = mix(moving * 8, 10, final); }
  const trackOpacity = reduced ? 0 : .2 * moving;
  return <Frame dark={dark} label={`${concept} logo race. The word taek overtakes over and resolves into overtaek.`}>
    <defs><linearGradient id={`${uid}-trail`}><stop stopColor={accent} stopOpacity="0" /><stop offset="1" stopColor={accent} stopOpacity=".7" /></linearGradient></defs>
    <g opacity={trackOpacity} stroke={accent} strokeDasharray="3 9"><line x1="60" x2="700" y1={concept === "switch" ? 214 : 275} y2={concept === "switch" ? 214 : 275} /><line x1="60" x2="700" y1="321" y2="321" /></g>
    {!reduced && Array.from({ length: 19 }, (_, i) => {
      const px = 50 + ((i * 91 - p * (600 + i * 13)) % 660 + 660) % 660;
      const py = 121 + (i * 47) % 217;
      return <line key={i} x1={px} x2={px + 8 + (i % 3) * 16} y1={py} y2={py} stroke={accent} strokeWidth={i % 4 === 0 ? 3 : 1} strokeLinecap="round" opacity={moving * (.12 + (i % 4) * .08)} />;
    })}
    {concept === "sling" && <path d={`M${tx + 48} ${ty + 12}Q${(tx + ox) / 2} 350 ${ox + 70} ${oy + 13}`} stroke={accent} strokeWidth="3" opacity={pulse(p, .45, .25) * .5} />}
    {concept === "relay" && <g opacity={pulse(p, .6, .3)}><line x1="418" x2="418" y1="100" y2="335" stroke={accent} strokeWidth="1.5" />{Array.from({ length: 8 }, (_, i) => <rect key={i} x={i % 2 ? 418 : 411} y={105 + i * 7} width="7" height="7" fill={accent} />)}<text x="432" y="116" fontSize="10" fontFamily={ui} fill={accent} letterSpacing="2">LEAD CHANGE</text></g>}
    <g opacity={moving * .5}><rect x={tx - 100} y={ty - 50} width="105" height="6" rx="3" fill={`url(#${uid}-trail)`} /><rect x={tx - 65} y={ty - 18} width="67" height="3" rx="1.5" fill={`url(#${uid}-trail)`} /></g>
    <Word word="over" x={ox} y={oy} width={208} color={color} lean={lean} opacity={enterOver} />
    {concept === "relay" && [1, 2].map(i => <Word key={i} word="taek" x={tx - i * 24} y={ty} width={232} color={accent} lean={lean} opacity={moving * .16 / i} />)}
    <Word word="taek" x={tx} y={ty} width={232} color={accent} lean={lean} opacity={enterTaek} />
    {concept === "switch" && <path d="M167 278H593" stroke={accent} strokeWidth="3" opacity={final} />}
    {concept === "sling" && <path d="m579 278 24-8-8 22" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity={final} />}
    <g opacity={pulse(p, .71, .13)}><Spark x={615} y={175} r={14} color={accent} /><Spark x={630} y={271} r={6} color={accent} /></g>
    <text x="380" y="334" fill={dark ? "#b2c0a9" : "#768172"} opacity={final} fontSize="10" letterSpacing="4" textAnchor="middle">MAKE YOUR MOVE.</text>
  </Frame>;
}

export function TypeScene({ progress: p, concept, dark, reduced }: Omit<SceneProps, "family">) {
  const uid = useId().replace(/:/g, "");
  if (concept.startsWith("echo-")) return <StaggeredTypeScene progress={p} concept={concept} dark={dark} reduced={reduced} />;
  const color = dark ? "#f7faef" : ink;
  const accent = dark ? green : "#769d3e";
  const t = out(between(p, .05, .85));
  const moving = reduced ? 0 : Math.sin(between(p, .08, .9) * Math.PI);
  const lean = t * (concept === "lean" ? 16 : concept === "echo" ? 10 : 9);
  const x = concept === "speed" ? 181 : 150;
  const width = concept === "speed" ? 424 : 460;
  const y = 253 - Math.sin(t * Math.PI) * (reduced ? 0 : 5);
  return <Frame dark={dark} label={`${concept} static and animated overtaek wordmark treatment.`}>
    <defs><linearGradient id={`${uid}-fade`}><stop stopColor={accent} stopOpacity="0" /><stop offset="1" stopColor={accent} /></linearGradient></defs>
    {concept === "echo" && [3, 2, 1].map(i => <Word key={i} word="overtaek" x={x - i * (18 + moving * 17) * t} y={y + i * 2 * t} width={width} color={accent} lean={lean} opacity={t * (.14 - i * .032)} />)}
    {concept === "speed" && <g opacity={t}>{[0, 1, 2].map(i => <path key={i} d={`M${mix(155, 53 + i * 24, t)} ${198 + i * 23}h${102 - i * 18}`} stroke={accent} strokeWidth={7 - i} strokeLinecap="round" />)}<path d="M160 275h415" stroke={accent} strokeWidth="3" opacity=".5" /></g>}
    {concept === "ribbon" && <g opacity={t}><path d="M96 276C207 311 506 308 626 247C688 211 621 158 576 164" stroke={accent} strokeWidth="12" strokeLinecap="round" strokeDasharray="730" strokeDashoffset={730 * (1 - t)} /><path d="m578 147-19 17 25 14" stroke={accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity={between(t, .85, 1)} /></g>}
    {concept === "lean" && <g opacity={t}><path d="M148 288 609 263 600 274 148 292Z" fill={accent} /><path d="m624 203 16-7-9 17" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></g>}
    <Word word="overtaek" x={x + moving * 11} y={y} width={width} color={color} lean={lean} />
    {concept === "echo" && <rect x="73" y="277" width="535" height="2" fill={`url(#${uid}-fade)`} opacity={t * .45} />}
    {!reduced && [0, 1, 2, 3, 4].map(i => <line key={i} x1={95 + (i * 143 + 900 - p * 900) % 570} x2={125 + (i * 143 + 900 - p * 900) % 570} y1={150 + i * 37} y2={150 + i * 37} stroke={accent} strokeWidth="1.5" opacity={moving * .25} />)}
    <text x="380" y="349" textAnchor="middle" fontSize="10" letterSpacing="3.4" fill={dark ? "#b2c0a9" : "#768172"} opacity={ease(between(p, .7, 1))}>ALWAYS SURPASSING YOURSELF.</text>
  </Frame>;
}

/** One stretched glyph silhouette, progressively dissolved into a continuous wake. */
function ContinuousWake({ word, x, y, width, lean, color, length, strength, jet, uid }: { word: string; x: number; y: number; width: number; lean: number; color: string; length: number; strength: number; jet?: boolean; uid: string }) {
  return <g opacity={strength}>
    <defs>
      <linearGradient id={`${uid}-fade`} gradientUnits="userSpaceOnUse" x1={x - length - 45} x2={x + width} y1="0" y2="0"><stop stopColor="white" stopOpacity="0" /><stop offset=".25" stopColor="white" stopOpacity=".06" /><stop offset=".65" stopColor="white" stopOpacity=".65" /><stop offset=".95" stopColor="white" stopOpacity=".8" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
      <mask id={`${uid}-mask`} maskUnits="userSpaceOnUse" x="-100" y="0" width="960" height="440"><rect x="-100" width="960" height="440" fill={`url(#${uid}-fade)`} /></mask>
      <filter id={`${uid}-blur`} x="-70%" y="-70%" width="240%" height="240%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={jet ? "13 2.8" : "6 1.3"} /></filter>
      <linearGradient id={`${uid}-air`}><stop stopColor={color} stopOpacity="0" /><stop offset=".6" stopColor={color} stopOpacity=".14" /><stop offset="1" stopColor={color} stopOpacity=".5" /></linearGradient>
    </defs>
    {jet && <path d={`M${x - length - 55} ${y - 32}C${x - length / 2} ${y - 58} ${x - 25} ${y - 74} ${x + 70} ${y - 61}L${x + 96} ${y - 12}C${x - 20} ${y - 4} ${x - length / 2} ${y - 25} ${x - length - 55} ${y - 32}Z`} fill={`url(#${uid}-air)`} />}
    <g mask={`url(#${uid}-mask)`} filter={`url(#${uid}-blur)`}><Word word={word} x={x - length} y={y} width={width + length} size={124} color={color} lean={lean} opacity={jet ? .55 : .52} /></g>
  </g>;
}

function StaggeredLogoScene({ progress: p, concept, dark, reduced, lockup = "stacked" }: Pick<SceneProps, "progress" | "concept" | "dark" | "reduced" | "lockup">) {
  const color = dark ? "#f7faef" : ink, accent = dark ? green : "#769d3e";
  const { layout, ox, tx, overSpeed, taekSpeed } = staggeredLogoFrame(p, concept);
  const settle = ease(between(p, .7, 1));
  const resolve = lockup === "inline" ? ease(between(p, .79, .98)) : 0;
  const moving = reduced ? 0 : Math.sin(between(p, .06, .92) * Math.PI);
  const overX = mix(ox, 160, resolve), taekX = mix(tx, 368, resolve);
  const oy = mix(layout.oy, 253, resolve), ty = mix(layout.oy + layout.gap, 253, resolve);
  const size = mix(124, 98, resolve), ow = mix(248, 208, resolve), tw = mix(272, 232, resolve);
  const overLean = mix(layout.lean + (reduced ? 0 : overSpeed * 9 + moving * 2), 9, resolve);
  const taekLean = mix(layout.lean + (reduced ? 0 : taekSpeed * 10 + moving * 2), 9, resolve);
  const enterOver = out(between(p, .01, .14));
  const enterTaek = out(between(p, .16, .28));
  return <Frame dark={dark} label={`${concept}: over enters first, then taek races into a ${Math.round(layout.heightOverlap * 100)}% height and ${layout.letterOverlap}-letter overlap, ${lockup === "inline" ? "resolving into a single line" : "finishing on the double-exposure lockup"}.`}>
    {!reduced && Array.from({ length: 16 }, (_, i) => <line key={i} x1={45 + ((i * 81 - p * 700) % 660 + 660) % 660} x2={62 + ((i * 81 - p * 700) % 660 + 660) % 660} y1={123 + i * 17 % 210} y2={123 + i * 17 % 210} stroke={accent} strokeWidth={i % 3 === 0 ? 2 : 1} opacity={moving * .22} />)}
    <g opacity={enterOver}>
      {[3, 2, 1].map(i => <Word key={`o-${i}`} word="over" x={overX - i * (19 + (reduced ? 0 : overSpeed * 12))} y={oy} width={ow} size={size} color={accent} lean={overLean} opacity={(.19 - i * .044) * (1 + (reduced ? 0 : overSpeed * .55))} />)}
    </g>
    <g opacity={enterTaek}>
      {[3, 2, 1].map(i => <Word key={`t-${i}`} word="taek" x={taekX - i * (19 + (reduced ? 0 : taekSpeed * 13))} y={ty} width={tw} size={size} color={accent} lean={taekLean} opacity={(.19 - i * .044) * (1 + (reduced ? 0 : taekSpeed * .65))} />)}
    </g>
    <Word word="over" x={overX} y={oy} width={ow} size={size} color={color} lean={overLean} opacity={enterOver} />
    <Word word="taek" x={taekX} y={ty} width={tw} size={size} color={color} lean={taekLean} opacity={enterTaek} />
    <g opacity={pulse(p, .78, .11)}><Spark x={taekX + tw + 14} y={ty - 75} r={10} color={accent} /><Spark x={taekX + tw + 27} y={ty - 25} r={5} color={accent} /></g>
    <text x="380" y="350" fill={dark ? "#b2c0a9" : "#768172"} opacity={settle} fontSize="10" letterSpacing="3.4" textAnchor="middle">ALWAYS SURPASSING YOURSELF.</text>
  </Frame>;
}

function StaggeredTypeScene({ progress: p, concept, dark, reduced }: Pick<SceneProps, "progress" | "concept" | "dark" | "reduced">) {
  const uid = useId().replace(/:/g, "");
  const color = dark ? "#f7faef" : ink, accent = dark ? green : "#769d3e";
  const t = out(between(p, .04, .84));
  const speed = reduced ? 0 : Math.sin(between(p, .1, .94) * Math.PI);
  const layout = stackedLayout("chase-stagger");
  const lean = layout.lean * t;
  const rows = [{ word: "over", x: layout.ox, y: layout.oy, width: 248 }, { word: "taek", x: layout.tx, y: layout.oy + layout.gap, width: 272 }];
  return <Frame dark={dark} label={`${concept}: staggered over and taek with ${concept === "echo-stagger" ? "separate afterimages" : "one continuous fading letter-shaped trail on each row"}.`}>
    {rows.map((row, index) => <g key={row.word}>
      {concept === "echo-stagger" ? [3, 2, 1].map(i => <Word key={i} {...row} x={row.x - i * (19 + speed * 11) * t} color={accent} size={124} lean={lean} opacity={t * (.19 - i * .044)} />)
        : <ContinuousWake {...row} lean={lean} color={accent} length={(concept === "echo-jet" ? 152 : 110) * t + speed * 40} strength={t} jet={concept === "echo-jet"} uid={`${uid}-${index}`} />}
    </g>)}
    <Word {...rows[0]} size={124} lean={lean} color={color} />
    <Word {...rows[1]} size={124} lean={lean} color={color} />
    <text x="380" y="350" textAnchor="middle" fontSize="10" letterSpacing="3.4" fill={dark ? "#b2c0a9" : "#768172"} opacity={ease(between(p, .7, 1))}>ALWAYS SURPASSING YOURSELF.</text>
  </Frame>;
}

export function Scene(props: SceneProps) {
  if (props.family === "overtake") return <OvertakeScene {...props} />;
  if (props.family === "logo") return <LogoScene {...props} />;
  return <TypeScene {...props} />;
}
