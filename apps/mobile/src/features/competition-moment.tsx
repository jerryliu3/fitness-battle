import { ChartSvg, ChartText } from "../ui/chart-text";
import { chartTextProps, textStyle  } from "../ui/section";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { photoFinishFrame, sportById, type CompetitionMoment as Moment } from "@fitness-battle/shared";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { FocusButton, f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
import { playCue } from "../lib/haptics";

export function CompetitionMoment({ moment, remaining, onConfirm }: { moment: Moment; remaining: number; onConfirm: () => void }) {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const previousCount = useRef(0), skipped = useRef(false), confirmed = useRef(false);
  const passedBy = !moment.plan.hasOvertake;
  const count = passedBy ? moment.plan.passedByIds?.length ?? 0 : moment.plan.overtakenIds.length;
  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    let raf = 0;
    setProgress(0);
    const start = Date.now(), duration = 4200 + count * 1150;
    const tick = () => { if (skipped.current) return; const p = Math.min(1, (Date.now() - start) / duration); setProgress(p); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moment.id, reduced, count]);
  const frame = photoFinishFrame(moment, progress);
  useEffect(() => {
    if (frame.count > previousCount.current && !passedBy && !reduced) void playCue("success");
    previousCount.current = frame.count;
  }, [frame.count, passedBy, reduced]);
  const peers = Object.values(moment.plan.rivals).filter(r => passedBy ? r.passedYou : r.overtaken).sort((a, b) => a.endValue - b.endValue);
  const span = Math.max(.5, Math.abs(moment.plan.youAfter - moment.plan.youBefore), ...peers.map(r => Math.abs(r.endValue - moment.plan.youBefore))) * 1.25;
  const x = (value: number) => 310 + (value - frame.youValue) / span * 390;
  const zoom = reduced ? 1 : 1 + frame.focus * .28;
  const names = peers.map(r => r.name ?? "Rival").join(", ");
  return <View style={{ gap: 20 }}>
    <Text style={f.kicker}>{sportById(moment.sport).name} · {passedBy ? "THE FIELD MOVED" : "PHOTO FINISH"}</Text>
    <Text accessibilityRole="header" style={textStyle("display")}>{frame.done ? passedBy ? "The chase is on." : "That’s your move." : passedBy ? "A rival is making a move." : "Every pass. Earned."}</Text>
    <Text style={textStyle("body")}>{frame.done ? `${passedBy ? "Passed by" : "You passed"} ${names}.` : passedBy ? "Here’s how your field changed." : "Your effort is moving you through the field."}</Text>
    <View style={{ flexDirection: "row", gap: 12, alignItems: "baseline", flexWrap: "wrap" }} accessibilityLiveRegion="polite">
      <Text style={f.massive}>{frame.count}</Text>
      <Text style={textStyle("body")}>{passedBy ? `rival${frame.count === 1 ? "" : "s"} passed you` : `overtake${frame.count === 1 ? "" : "s"}`}</Text>
      {!passedBy && frame.count > 1 && <Text style={[textStyle("label"), { padding: 10, borderRadius: 18, backgroundColor: c.tennis }]}>×{frame.count} COMBO</Text>}
    </View>
    <View style={{ width: "100%", aspectRatio: 620 / 370, borderRadius: 24, overflow: "hidden", backgroundColor: "#176c75" }}>
      <ChartSvg viewBox="0 0 620 370" width="100%" height="100%" accessible accessibilityLabel={`${frame.count} ${passedBy ? "rivals passed you" : "overtakes"}. Place ${frame.rank}. ${names}`}>
        <Rect width={620} height={370} fill="#103e46"/>
        <G transform={`translate(${310 * (1 - zoom)} ${180 * (1 - zoom)}) scale(${zoom})`}>
          {[92, 180, 268].map(y => <G key={y}><Rect x={-200} y={y - 35} width={1000} height={70} rx={18} fill="#ffffff09"/><Line x1={-200} x2={900} y1={y} y2={y} stroke="#ffffff26" strokeDasharray="5 12"/></G>)}
          {peers.map((r, i) => { const px = x(frame.values[r.id]), y = i % 2 ? 268 : 92; return <G key={r.id} transform={`translate(${px} ${y})`}>
            {frame.nearestId === r.id && frame.focus > .2 && <Circle r={34 + frame.focus * 14} fill="none" stroke="#f7c948" strokeWidth={2} opacity={frame.focus}/>}
            <Line x1={-100} x2={-20} y1={0} y2={0} stroke="#c9d6e3" strokeWidth={12} opacity={.16} strokeLinecap="round"/>
            <Rect x={-13} y={-20} width={26} height={40} rx={13} fill="#c9d6e3" stroke="white"/>
            <ChartText y={-33} textAnchor="middle" fill="white" >{(r.name ?? "Rival").split(" ")[0]}</ChartText>
          </G>; })}
          <G transform="translate(310 180)">
            {[0, 1, 2, 3].map(i => <Line key={i} x1={-110 - i * 22} x2={-18} y1={-12 + i * 8} y2={-12 + i * 8} stroke="#f7c948" opacity={.4 - i * .08} strokeWidth={5} strokeLinecap="round"/>)}
            <Rect x={-15} y={-23} width={30} height={46} rx={15} fill="#ffc400" stroke="#fff5d1" strokeWidth={2}/>
            <ChartText y={-38} textAnchor="middle" fill="#fff5d1"  >YOU</ChartText>
          </G>
        </G>
        {!reduced && frame.focus > .55 && <><Path d="M260 134v-12h18m64 0h18v12m0 92v12h-18m-64 0h-18v-12" stroke="#fff5d1" strokeWidth={2} fill="none"/><ChartText x={310} y={333} fill="#fff5d1" textAnchor="middle"  >PHOTO FINISH</ChartText></>}
        {!passedBy && frame.count > 0 && !frame.done && <G><Rect x={420} y={18} width={180} height={34} rx={17} fill="#f7c948"/><ChartText x={510} y={40} textAnchor="middle" fill="#142b3b"  >+1 OVERTAKE · ×{frame.count}</ChartText></G>}
      </ChartSvg>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><Text style={textStyle("caption")}>Your place</Text><Text style={textStyle("heading")}>#{moment.plan.rankBefore} → #{frame.rank}</Text><Text style={textStyle("caption")}>{frame.youValue.toFixed(1)} {moment.unit} this round</Text></View>
    <Text style={textStyle("caption")}>{frame.done ? remaining > 1 ? "There’s more to your update." : "Your stats are up to date." : "Replaying the change in accumulated effort."}</Text>
    <FocusButton label={frame.done ? remaining > 1 ? "Continue →" : "Back to the app →" : "Skip animation"} onPress={() => frame.done ? (() => { if (!confirmed.current) { confirmed.current = true; onConfirm(); } })() : (() => { skipped.current = true; setProgress(1); })()}/>
  </View>;
}
