import { Component, lazy, Suspense, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { textStyle } from "../ui/section";

const CourseMap = lazy(() => import("../ui/course-map"));
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Text style={textStyle("body")}>This course view needs a new native app build with Mapbox installed.</Text> : this.props.children; }
}

/** Presentation-only scene. The field/replay host owns the weekly course. */
export function GeographicCourse({ lanes, hiddenIds = [], unit, selectedId, focusRequest, onSelect, course, error = "", onRetry, controlsBottom = 8, overlaysHidden = false, optionsTop, distanceTarget }: {
  hiddenIds?: readonly string[]; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void;
  distanceTarget?: CourseDistanceTarget | null;
  course: RaceCourse | null; error?: string; onRetry?: () => void; controlsBottom?: number; overlaysHidden?: boolean; optionsTop?: number;
}) {
  if (unit !== "mi" && unit !== "km") return null;
  return <View style={{ flex: 1, minHeight: 300 }}>
    {!mobileEnv.mapboxAccessToken ? <Text style={{ ...textStyle("body"), padding: 16 }}>Mapbox access is not configured for this build.</Text> : !course ?
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16, gap: 12 }}><Text accessibilityRole={error ? "alert" : undefined} style={textStyle("body")}>{error || "Loading this competition’s course…"}</Text>{error && onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 16 }}><Text style={textStyle("label")}>Retry</Text></Pressable> : null}</View> :
      <MapBoundary><Suspense fallback={<ActivityIndicator />}><CourseMap key={course.name + course.length} course={course} lanes={lanes} hiddenIds={hiddenIds} unit={unit} selectedId={selectedId} focusRequest={focusRequest} onSelect={onSelect} distanceTarget={distanceTarget} controlsBottom={controlsBottom} overlaysHidden={overlaysHidden} optionsTop={optionsTop} /></Suspense></MapBoundary>}
  </View>;
}
