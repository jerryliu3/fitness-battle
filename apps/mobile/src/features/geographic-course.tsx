import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MAX_COURSE_BYTES, raceCourseFromGpx, requestMapboxCourse, type RaceCourse, type ArenaSceneLane } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { textStyle } from "../ui/section";

const CourseMap = lazy(() => import("../ui/course-map"));
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Text style={textStyle("body")}>This course view needs a new native app build with Mapbox installed.</Text> : this.props.children; }
}
/** Presentation-only scene. The field/replay host owns mode, course and selection. */
export function GeographicCourse({ lanes, unit, selectedId, focusRequest, onSelect, course, onCourseChange, controlsBottom = 8, overlaysHidden = false }: {
  lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void;
  course: RaceCourse | null; onCourseChange(course: RaceCourse | null): void; controlsBottom?: number; overlaysHidden?: boolean;
}) {
  const [start, setStart] = useState(""), [finish, setFinish] = useState(""), [cycling, setCycling] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const work = useRef<AbortController | null>(null);
  useEffect(() => () => work.current?.abort(), []);
  const run = async (load: (signal: AbortSignal) => Promise<RaceCourse | null>) => {
    work.current?.abort(); const request = new AbortController(); work.current = request;
    setBusy(true); setError("");
    try { const next = await load(request.signal); if (!request.signal.aborted && next) onCourseChange(next); }
    catch (cause) { if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "The course could not be loaded."); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  if (unit !== "mi" && unit !== "km") return null;
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={action} style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: "#f7c948", opacity: disabled ? .5 : 1, justifyContent: "center" }}><Text style={{ ...textStyle("label"), color: "#142b3b" }}>{label}</Text></Pressable>;
  return <View style={{ flex: 1, minHeight: 300 }}>
        {!mobileEnv.mapboxAccessToken ? <Text style={{ ...textStyle("body"), padding: 16 }}>Mapbox access is not configured for this build.</Text> : course ? <MapBoundary><Suspense fallback={<ActivityIndicator />}><CourseMap key={course.name + course.length} course={course} lanes={lanes} unit={unit} selectedId={selectedId} focusRequest={focusRequest} onSelect={onSelect} controlsBottom={controlsBottom} overlaysHidden={overlaysHidden} extraControls={button("Change course", () => onCourseChange(null))} /></Suspense></MapBoundary> : <ScrollView onTouchStart={event => event.stopPropagation()} contentContainerStyle={{ padding: 16, paddingTop: controlsBottom > 8 ? 130 : 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text style={textStyle("body")}>Import a GPX track, or choose a start and destination anywhere in the world. This changes your scenery without recording an activity or changing scores.</Text>
          {button("Import GPX course", () => { void run(async signal => {
            const DocumentPicker = await import("expo-document-picker");
            const picked = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
            if (signal.aborted || picked.canceled) return null;
            const asset = picked.assets[0];
            if (!/\.gpx$/i.test(asset.name) || (asset.size ?? 0) > MAX_COURSE_BYTES) throw new Error("Choose a GPX file under 4 MB.");
            const { File } = await import("expo-file-system");
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
  </View>;
}
