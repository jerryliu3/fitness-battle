import { textStyle } from "./section";
import { SHELL_COLORS as clubColors } from "@fitness-battle/shared";
import { createElement, useEffect, useRef, useState, type ComponentType } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Mask, Path, Pattern, Rect, Stop, Text as SvgText } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultFieldAppearance, fieldAppearanceKey, fieldGrounds, readFieldAppearance, fieldOverview, overviewTarget, type FieldAppearance, type FieldNode, type ArenaSceneLane, type ArenaViewWindow } from "@fitness-battle/shared";
import { FocusSheet, f } from "./focus";

const elements = { circle: Circle, clipPath: ClipPath, defs: Defs, ellipse: Ellipse, g: G, line: Line, linearGradient: LinearGradient, mask: Mask, path: Path, pattern: Pattern, rect: Rect, stop: Stop, text: SvgText };
export function drawFieldNode(node: FieldNode, key: number): React.ReactNode {
  const Element = elements[node.tag] as ComponentType<Record<string, unknown>>;
  return createElement(Element, { ...node.attrs, key }, node.text ?? node.children?.map(drawFieldNode));
}
export function useFieldAppearance(account: string, sport: string) {
  const key = fieldAppearanceKey(account, sport), generation = useRef(0);
  const [saved, setSaved] = useState<{ key: string; value: FieldAppearance } | null>(null);
  useEffect(() => {
    let canceled = false;
    const revision = ++generation.current;
    void AsyncStorage.getItem(key).then(raw => { if (!canceled && revision === generation.current) setSaved({ key, value: readFieldAppearance(raw) }); }).catch(() => { /* Device storage optional. */ });
    return () => { canceled = true; };
  }, [key]);
  const value = saved?.key === key ? saved.value : defaultFieldAppearance;
  const update = (next: FieldAppearance) => {
    generation.current++;
    setSaved({ key, value: next });
    void AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => { /* Keep in-memory choice. */ });
  };
  return [value, update] as const;
}
export function FieldGroundPicker({ appearance, onChange }: { appearance: FieldAppearance; onChange: (value: FieldAppearance) => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose field ground" style={[f.row, { minHeight: 44 }]} onPress={() => setOpen(true)}><Text style={textStyle("label")}>{fieldGrounds[appearance.ground].name}</Text><Text style={textStyle("caption")}>Customize</Text></Pressable>
    <FocusSheet open={open} title="Your field" body="Choose your ground and surroundings. Saved on this device for this event." onClose={() => setOpen(false)}>
      <View style={{ gap: 8 }}>
        {Object.entries(fieldGrounds).map(([id, item]) => <Pressable accessibilityRole="button" accessibilityState={{ selected: appearance.ground === id }} key={id} style={[f.row, { minHeight: 48, borderWidth: 1, borderColor: appearance.ground === id ? "#a67c00" : clubColors.line, borderRadius: 12, padding: 10 }]} onPress={() => onChange({ ...appearance, ground: id as FieldAppearance["ground"] })}><View style={{ width: 22, height: 28, borderRadius: 6, backgroundColor: item.lane }}/><Text style={[textStyle("body"), f.grow]}>{item.name}</Text>{appearance.ground === id && <Text style={textStyle("caption")}>Selected</Text>}</Pressable>)}
        <View style={f.row}>{(["open", "club"] as const).map(edges => <Pressable key={edges} accessibilityRole="button" accessibilityState={{ selected: appearance.edges === edges }} style={{ minHeight: 44, flex: 1, padding: 12, borderRadius: 10, backgroundColor: appearance.edges === edges ? "#f7edc9" : clubColors.soft }} onPress={() => onChange({ ...appearance, edges })}><Text style={textStyle("body")}>{edges === "club" ? "Club grounds" : "Open edges"}</Text></Pressable>)}</View>
        <Pressable accessibilityRole="button" style={{ minHeight: 44, padding: 12 }} onPress={() => setOpen(false)}><Text style={textStyle("label")}>Done</Text></Pressable>
      </View>
    </FocusSheet>
  </>;
}
export function FieldOverview({ lanes, view, unit, onNavigate }: { lanes: ArenaSceneLane[]; view: ArenaViewWindow; unit: string; onNavigate: (value: number) => void }) {
  const overview = fieldOverview(lanes, view), [width, setWidth] = useState(240);
  const latest = useRef({ overview, onNavigate, width }); latest.current = { overview, onNavigate, width };
  const start = useRef(0);
  const [pan] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: event => { start.current = event.nativeEvent.locationX; const p = latest.current; p.onNavigate(overviewTarget(start.current / p.width, p.overview.high)); },
    onPanResponderMove: (_, gesture) => { const p = latest.current; p.onNavigate(overviewTarget((start.current + gesture.dx) / p.width, p.overview.high)); },
  }));
  return <View style={[f.row, { gap: 8, backgroundColor: clubColors.card, paddingHorizontal: 10 }]}>
    <Text style={textStyle("caption")}>0</Text>
    <View {...pan.panHandlers} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ flex: 1, minHeight: 44, justifyContent: "center" }} accessible accessibilityRole="adjustable" accessibilityLabel="Field distance overview" aria-valuemin={0} aria-valuemax={overview.high} aria-valuenow={Math.min(overview.high, Math.max(0, view.center))} aria-valuetext={`${view.center.toFixed(1)} ${unit}`} accessibilityValue={{ min: 0, max: overview.high, now: Math.min(overview.high, Math.max(0, view.center)), text: `${view.center.toFixed(1)} ${unit}` }} accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={e => onNavigate(Math.max(0, Math.min(overview.high, view.center + (e.nativeEvent.actionName === "increment" ? 1 : -1) * view.span / 4)))}>
      <View pointerEvents="none" style={{ height: 1, backgroundColor: "#bdc8b5" }}/>
      <View pointerEvents="none" style={{ position: "absolute", top: 12, height: 20, left: `${overview.from * 100}%`, width: `${overview.width * 100}%`, minWidth: 2, borderWidth: 1, borderColor: "#a9bc93", borderRadius: 4, backgroundColor: "#b4c79b26" }}/>
      {lanes.filter(l => !l.ghost).map(l => <View pointerEvents="none" key={l.id} style={{ position: "absolute", left: `${Math.max(0, Math.min(100, l.value / overview.high * 100))}%`, top: 18, width: 3, height: 9, borderRadius: 3, backgroundColor: l.you ? "#d6a900" : "#a6b9b5" }}/>) }
    </View><Text style={textStyle("caption")}>{overview.high.toFixed(1)} {unit}</Text>
  </View>;
}
