import { FieldViewSwitcher } from "../ui/field-view-switcher";
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { MAX_COURSE_BYTES, raceCourseFromGpx, requestMapboxCourse, type RaceCourse, type ArenaSceneLane } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { textStyle } from "../ui/section";
import { useReducedMotion } from "../ui/use-reduced-motion";

const CourseMap = lazy(() => import("../ui/course-map"));
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Text style={textStyle("body")}>This course view needs a new native app build with Mapbox installed.</Text> : this.props.children; }
}
export function GeographicCourse({ lanes, unit, selectedId: initialSelectedId, active = true, open, onClose, onViewChange }: {
  lanes: ArenaSceneLane[]; unit: string; selectedId: string; active?: boolean; open: boolean; onClose(): void; onViewChange(value: "2d" | "3d" | "4d"): void;
}) {
  const reduced = useReducedMotion();
  const [selectedId, setSelectedId] = useState(initialSelectedId), [focusRequest, setFocusRequest] = useState(0);
  const onSelect = (id: string) => { setSelectedId(id); setFocusRequest(value => value + 1); };
  const [course, setCourse] = useState<RaceCourse | null>(null);
  const [start, setStart] = useState(""), [finish, setFinish] = useState(""), [cycling, setCycling] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const work = useRef<AbortController | null>(null);
  useEffect(() => () => work.current?.abort(), []);
  useEffect(() => { if (!active) { work.current?.abort(); setBusy(false); onClose(); } }, [active]);
  useEffect(() => { if (open) setSelectedId(initialSelectedId); }, [open, initialSelectedId]);
  useEffect(() => { if (!open) { work.current?.abort(); setBusy(false); } }, [open]);
  if (unit !== "mi" && unit !== "km") return null;
  const close = () => { work.current?.abort(); setBusy(false); onClose(); };
  const run = async (load: (signal: AbortSignal) => Promise<RaceCourse | null>) => {
    work.current?.abort(); const request = new AbortController(); work.current = request;
    setBusy(true); setError("");
    try { const next = await load(request.signal); if (!request.signal.aborted && next) setCourse(next); }
    catch (cause) { if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "The course could not be loaded."); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  const button = (label: string, action: () => void, disabled = false, key = label, selected?: boolean) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled} onPress={action} style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: selected === false ? "#ffffff" : "#f7c948", opacity: disabled ? .5 : 1, justifyContent: "center" }}><Text style={{ ...textStyle("label"), color: "#142b3b" }}>{label}</Text></Pressable>;
  return <>
    <Modal visible={open} animationType={reduced ? "none" : "slide"} presentationStyle="fullScreen" onRequestClose={close}>
      <SafeAreaProvider style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, backgroundColor: "#f8f9f6" }}>
        <View style={{ padding: 12, gap: 8 }}>
          <FieldViewSwitcher value="4d" geographic onChange={onViewChange} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>{button("Back", close)}<Text numberOfLines={2} style={{ ...textStyle("heading"), flex: 1 }}>{course?.name ?? "Choose a race course"}</Text>{course ? button("Change course", () => setCourse(null)) : null}</View>
          {course ? <Text style={textStyle("caption")}>{(course.length / (unit === "mi" ? 1609.344 : 1000)).toFixed(2)} {unit} · Your competition totals on a shared route · Out-and-back course</Text> : null}
        </View>
        {!mobileEnv.mapboxAccessToken ? <Text style={{ ...textStyle("body"), padding: 16 }}>Mapbox access is not configured for this build.</Text> : course ? <MapBoundary><Suspense fallback={<ActivityIndicator />}><CourseMap key={course.name + course.length} course={course} lanes={lanes} unit={unit} selectedId={selectedId} focusRequest={focusRequest} onSelect={onSelect} /></Suspense></MapBoundary> : <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text style={textStyle("body")}>Import a GPX track, or choose a start and destination anywhere in the world. This changes your scenery without recording an activity or changing scores.</Text>
          {button("Import GPX course", () => { void run(async signal => {
            const picked = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
            if (signal.aborted || picked.canceled) return null;
            const asset = picked.assets[0];
            if (!/\.gpx$/i.test(asset.name) || (asset.size ?? 0) > MAX_COURSE_BYTES) throw new Error("Choose a GPX file under 4 MB.");
            const file = new File(asset.uri);
            if (file.size > MAX_COURSE_BYTES) throw new Error("Choose a GPX file under 4 MB.");
            return raceCourseFromGpx(await file.text(), asset.name.replace(/\.gpx$/i, ""));
          }); }, busy)}
          <Text style={textStyle("label")}>Request a route</Text>
          {[["Start address, city or longitude,latitude", start, setStart], ["Destination address, city or longitude,latitude", finish, setFinish]].map(([label, value, change]) => <TextInput key={String(label)} accessibilityLabel={String(label)} placeholder={String(label)} value={String(value)} onChangeText={change as (value: string) => void} maxLength={240} style={{ ...textStyle("body"), minHeight: 48, padding: 12, borderWidth: 1, borderColor: "#e3e9e7", borderRadius: 12, backgroundColor: "#ffffff" }} />)}
          {button(cycling ? "Cycling route" : "Walking route", () => setCycling(!cycling), busy)}
          {button(busy ? "Finding route…" : "Find course", () => { void run(signal => requestMapboxCourse(start, finish, cycling ? "cycling" : "walking", mobileEnv.mapboxAccessToken, signal)); }, busy || !start.trim() || !finish.trim())}
          <Text style={textStyle("caption")}>For precise endpoints, enter longitude,latitude. Place searches use the first matching location; inspect the route before using it.</Text>
        </ScrollView>}
        {busy ? <ActivityIndicator /> : null}
        {error ? <Text accessibilityRole="alert" style={{ ...textStyle("body"), padding: 12 }}>{error}</Text> : null}
        {course ? <ScrollView horizontal contentContainerStyle={{ gap: 8, padding: 12 }} style={{ flexGrow: 0 }} accessibilityLabel="Course athletes">{lanes.filter(lane => !lane.ghost).map(lane => button(`${lane.you ? "You" : lane.name} · ${lane.value.toFixed(2)} ${unit}`, () => onSelect(lane.id), false, lane.id, lane.id === selectedId))}</ScrollView> : null}
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  </>;
}
