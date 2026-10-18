import { useId } from "react";
import { Ember } from "@/components/mascot/ember";
import { LANES, laneFrame } from "./catalog";
import { MaterialRacer } from "./material-art";
import type { MaterialConcept } from "./material-concepts";
import { RefinedRacer } from "./refinement-art";
import { REFINEMENTS, TWIN_REFINEMENT, refinementColors, type RefinedSpec } from "./refinements";

export function LaneArt({ index, progress, gain, ghost = true, labels = true, refinement, flow = true, material, materialDark = false, materialLight = 0 }: { index: number; progress: number; gain: number; ghost?: boolean; labels?: boolean; refinement?: RefinedSpec; flow?: boolean; material?: MaterialConcept; materialDark?: boolean; materialLight?: number }) {
  const uid = useId().replace(/:/g, "");
  const lane = LANES[index] ?? LANES[0];
  const frame = laneFrame(progress, gain);
  const mode = lane.mode;
  const treatment = refinement ?? (index === 0 ? TWIN_REFINEMENT : index === 4 ? { ...REFINEMENTS[0], slow: "normal" as const } : index === 6 ? REFINEMENTS[9] : undefined);
  const background = material ? (materialDark ? "#000000" : "#ffffff") : treatment ? refinementColors(treatment).bg : undefined;
  const dark = material ? materialDark : treatment?.dark ?? mode === "photo";
  const ink = dark ? "#fafaf7" : "#282f2c";
  const muted = dark ? "#a6b3aa" : "#616c63";
  const rule = dark ? "#4c5750" : "#dfe5db";
  const y = (v: number) => 100 + ((frame.max - Math.max(frame.min, Math.min(frame.max, v))) / 6) * 285;
  const x = (i: number) => 37 + i * 58;
  const sorted = [...frame.athletes].sort((a, b) => b.value - a.value || (a.id === "you" ? 1 : b.id === "you" ? -1 : 0));
  const past = 13.2;
  const energy = Math.sin(progress * Math.PI) ** 2;
  const next = [...frame.athletes].filter(a => a.id !== "you" && a.value >= frame.value && a.value <= frame.max).sort((a, b) => a.value - b.value)[0];
  const crossing = frame.athletes.find(a => a.id !== "you" && a.value > 12.4 && Math.abs(a.value - frame.value) < .22);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 444" role="img" aria-label={`${lane.name}: fictional weekly running field. You are place ${frame.rank}, ${frame.value.toFixed(1)} km. ${frame.passes} overtakes. Higher means more distance. Past you is not ranked.`}>
    <defs>
      <linearGradient id={`${uid}-wake`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f1c75b" stopOpacity=".65" /><stop offset="1" stopColor="#f1c75b" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${uid}-peer`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#819486" stopOpacity=".3" /><stop offset="1" stopColor="#819486" stopOpacity="0" /></linearGradient>
      <clipPath id={`${uid}-field`}><rect x="8" y="82" width="294" height="320" rx="12" /></clipPath>
    </defs>
    <rect width="320" height="444" rx="18" fill={background ?? (dark ? "#282f2c" : mode === "toy" ? "#eef0e9" : "#fafaf7")} />
    <text x="17" y="24" fill={muted} fontSize="9" fontWeight="600" letterSpacing="1.2">RUNNING · THIS WEEK</text>
    <text x="302" y="24" textAnchor="end" fill={muted} fontSize="9">km ↑</text>
    {frame.athletes.map((a, i) => <g key={a.id}>
      <text x={x(i)} y="54" textAnchor="middle" fill={a.id === "you" ? ink : muted} fontSize="10" fontWeight={a.id === "you" ? 800 : 500}>{a.name.toUpperCase()}</text>
      <text x={x(i)} y="71" textAnchor="middle" fill={muted} fontSize="9">{sorted.findIndex(s => s.id === a.id) + 1}{a.id === "you" ? " · YOU" : ""}</text>
    </g>)}
    {mode === "toy" && <rect x="10" y="83" width="283" height="313" rx="14" fill="#e0e7d9" stroke="#ced8c8" />}
    {(mode === "trail" || mode === "ember" || mode === "toy") && <rect x="129" y="83" width="48" height="313" rx="15" fill="#f1c75b" opacity={mode === "toy" ? .25 : .1} />}
    {(treatment ? treatment.lanes : mode !== "ribbon") && Array.from({ length: treatment?.lanes ? 6 : 5 }, (_, i) => <line key={i} x1={treatment?.lanes ? 8 + i * 58 : x(i)} x2={treatment?.lanes ? 8 + i * 58 : x(i)} y1="85" y2="396" stroke={rule} strokeWidth={mode === "toy" ? 2 : 1} strokeDasharray={mode === "photo" ? "2 8" : mode === "echo" ? "1 7" : undefined} />)}
    {Array.from({ length: 7 }, (_, i) => Math.ceil(frame.min) + i).filter(v => v <= frame.max).map(v => <g key={v}>
      <path d={`M12 ${y(v)}H294`} stroke={rule} strokeWidth={mode === "photo" ? .8 : .7} strokeDasharray={mode === "ledger" ? undefined : "2 5"} />
      <text x="308" y={y(v) + 3} textAnchor="middle" fontSize="8" fill={muted}>{v}</text>
    </g>)}
    {mode === "photo" && next && <><path d={`M13 ${y(next.value)}H291`} stroke="#f1c75b" strokeWidth="1.5" opacity=".7" /><text x="16" y={y(next.value) - 8} fill="#f1c75b" fontSize="8">{next.value.toFixed(1)} · {next.name.toUpperCase()}</text></>}
    <g clipPath={`url(#${uid}-field)`}>
      {frame.athletes.map((a, i) => {
        const xx = x(i), yy = y(a.value), you = a.id === "you";
        const color = you ? "#f1c75b" : mode === "photo" ? "#a6b3aa" : "#819486";
        const edge = a.value > frame.max ? "↑" : a.value < frame.min ? "↓" : null;
        const after = a.value < frame.value && a.value > 12.4;
        return <g key={a.id}>
          {material && <MaterialRacer concept={material} x={xx} y={yy} radius={you ? 17 : 14} fast={you} dark={materialDark} light={materialLight} flow={flow && !edge} edge={edge} label={a.initials} />}
          {!material && treatment && <RefinedRacer spec={treatment} x={xx} y={yy} radius={you ? 17 : 14} fast={you} flow={flow && !edge} edge={edge} initials={treatment.ember && you ? undefined : a.initials} />}
          <g display={material || treatment ? "none" : undefined}>
          {(mode === "trail" || mode === "ember" || mode === "photo") && <path d={`M${xx} ${yy + 8}v${you ? 44 + energy * 35 : 40}`} stroke={color} strokeWidth={you ? 5 : 3} opacity={you ? .65 : .3} strokeLinecap="round" />}
          {mode === "ribbon" && <path d={`M${xx - 13 - (you ? energy * 5 : 0)} ${yy}Q${xx - 18} ${yy + 43} ${xx - 4} ${yy + 97}Q${xx + 1} ${yy + 50} ${xx + 14 + (you ? energy * 5 : 0)} ${yy}Z`} fill={`url(#${uid}-${you ? "wake" : "peer"})`} />}
          {mode === "stitch" && [30, 44, 58, 72].map((dy, j) => <path key={dy} d={`M${xx} ${yy + dy * (you ? 1 + energy * .3 : 1)}v5`} stroke={color} strokeWidth={you ? 4 : 3} strokeLinecap="round" opacity={.65 - j * .12} />)}
          {mode === "echo" && [14, 27].map((dy, j) => <circle key={dy} cx={xx} cy={yy + dy * (you ? 1 + energy * .4 : 1)} r="14" fill="none" stroke={color} strokeWidth="1.4" opacity={.35 - j * .15} />)}
          {mode === "toy" && <rect x={xx - 17} y={yy - 18 + 4} width="34" height="41" rx="15" fill="#282f2c" opacity=".2" />}
          {mode === "ember" && you && !edge ? <svg x={xx - 24} y={yy - 27} width="48" height="54"><Ember expression="focused" shadow={false} /></svg> : mode === "toy" ? <g transform={you ? `translate(${xx} ${yy}) scale(1 ${1 + energy * .12}) translate(${-xx} ${-yy})` : undefined}><rect x={xx - 17} y={yy - 18} width="34" height="41" rx="15" fill={you ? color : "#fafaf7"} stroke={you ? "#c29f47" : "#c5cfc0"} /><path d={`M${xx - 5} ${yy - 2}v3m10-3v3`} stroke="#282f2c" strokeWidth="2.2" strokeLinecap="round" /></g> : mode === "stitch" ? <rect x={xx - 13} y={yy - 18} width="26" height="36" rx="12" fill={you ? color : dark ? "#819486" : "#e0e5dc"} stroke={you ? "#b39a51" : "#819486"} /> : <circle cx={xx} cy={yy} r={you ? 17 : 14} fill={mode === "echo" ? "#fafaf7" : you ? color : mode === "ledger" ? "#282f2c" : dark ? "#435249" : "#ffffff"} stroke={you ? mode === "echo" ? "#282f2c" : "#c1a14a" : mode === "ledger" ? "#282f2c" : "#819486"} strokeWidth={you ? 2.5 : 1.5} />}
          {!(mode === "ember" && you && !edge) && mode !== "toy" && <text x={xx} y={yy + 3} textAnchor="middle" fontSize={you ? 8 : 8.5} fontWeight="700" fill={you ? "#282f2c" : mode === "ledger" || dark ? "#fafaf7" : "#616c63"}>{edge || (you ? "YOU" : a.initials)}</text>}
          {mode === "toy" && edge && <text x={xx} y={yy + 16} textAnchor="middle" fontSize="9" fill="#282f2c">{edge}</text>}
          </g>
          {labels && <><rect x={xx - 22} y={edge === "↑" ? yy + 22 : yy - (you && mode === "ember" ? 40 : 35)} width="44" height="17" rx="8" fill={background ?? (dark ? "#282f2c" : "#fafaf7")} /><text x={xx} y={edge === "↑" ? yy + 34 : yy - (you && mode === "ember" ? 28 : 23)} textAnchor="middle" fontSize="10" fontWeight="700" fill={ink}>{edge ? `${edge} ` : ""}{a.value.toFixed(1)}</text></>}
          {after && crossing && Math.abs(crossing.value - a.value) < .01 && <circle cx={xx} cy={yy} r={20 + Math.max(0, frame.value - a.value) * 45} fill="none" stroke="#b39a51" strokeWidth="1.3" opacity={1 - Math.max(0, frame.value - a.value) * 4} />}
        </g>;
      })}
      {ghost && <g><circle cx="175" cy={y(past)} r="9" stroke={muted} fill="none" strokeDasharray="2 3" />{past < frame.min && <text x="175" y={y(past) + 3} textAnchor="middle" fontSize="8" fill={muted}>↓</text>}</g>}
    </g>
    <path d="M15 407H303" stroke={rule} />
    <text x="17" y="427" fontSize="8" fill={muted}>{ghost ? `±3 km · ◌ Past you 13.2${past < frame.min ? " ↓" : ""}` : "±3 km around you"}</text>
    <text x="302" y="427" textAnchor="end" fontSize="8.5" fill={muted}>{frame.passes ? `↑ ${frame.passes} ${frame.passes === 1 ? "overtake" : "overtakes"}` : "Your own pace."}</text>
  </svg>;
}

export function LanePhone({ index, progress, gain, ghost = true, refinement, flow = true, material, materialDark = false, materialLight = 0 }: { index: number; progress: number; gain: number; ghost?: boolean; refinement?: RefinedSpec; flow?: boolean; material?: MaterialConcept; materialDark?: boolean; materialLight?: number }) {
  const frame = laneFrame(progress, gain);
  return <div className="pass-phone">
    <div className="pass-phone-status"><b>9:41</b><span>▮▮▮ &nbsp; ▰</span></div>
    <div className="pass-phone-header"><span className="pass-wordmark">overtaek</span><span className="pass-avatar">JL</span></div>
    <div className="pass-phone-title"><div><span className="pass-eyebrow">YOUR WEEKLY FIELD</span><h3>Good company.<br />A little competition.</h3></div><span className="pass-sport">↗ Run</span></div>
    <div className="pass-phone-stats"><div><strong>{frame.value.toFixed(1)}<small> km</small></strong><span>Your distance</span></div><div><strong>#{frame.rank}<small> / 5</small></strong><span>{frame.passes ? `↑ ${frame.passes} ${frame.passes === 1 ? "place" : "places"}` : "In your field"}</span></div></div>
    <LaneArt index={index} progress={progress} gain={gain} ghost={ghost} refinement={refinement} flow={flow} material={material} materialDark={materialDark} materialLight={materialLight} />
    <div className="pass-phone-note">{frame.passes ? `Nice move. You passed ${frame.passes === 1 ? "Mara" : "Mara and Jules"}.` : `${(13.8 - frame.value).toFixed(1)} km to Mara. Make your next move.`}</div>
    <div className="pass-phone-nav"><span>⌂<small>Home</small></span><span className="is-current">Ⅱ<small>Compete</small></span><span>◎<small>Crew</small></span><span>○<small>Athlete</small></span></div>
  </div>;
}
