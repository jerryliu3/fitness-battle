import { Component, lazy, Suspense, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { type CourseReplayFrame, type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { textStyle } from "../ui/section";
import { SHELL_COLORS as c } from "../theme";

const CourseMap = lazy(() => import("../ui/course-map"));
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean; missingNative: boolean }> {
  state = { failed: false, missingNative: false };
  static getDerivedStateFromError(error: Error) { return { failed: true, missingNative: /(?:RNMBX|RNMapbox).*(?:not found|not registered|not available)|native module.*(?:null|not found)|TurboModuleRegistry.*(?:RNMBX|RNMapbox)/i.test(error.message) }; }
  render() { return this.state.failed ? <Text style={textStyle("body")}>{this.state.missingNative ? "This app build is missing native map support. Install the latest build." : "This course could not open. Return to Compete and try again."}</Text> : this.props.children; }
}

/** Presentation-only scene. The field/replay host owns the weekly course. */
export function GeographicCourse({ cardSessionKey, initialFlat, onFlatChange, onFollowChange, followAthlete, onReady, replay, lanes, hiddenIds = [], unit, selectedId, focusRequest, onSelect, course, error = "", onRetry, controlsBottom = 8, overlaysHidden = false, optionsTop, onReplay, distanceTarget }: {
  onReady?: () => void; replay?: CourseReplayFrame; hiddenIds?: readonly string[]; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void;
  cardSessionKey?: string | number | boolean;
  initialFlat?: boolean; onFlatChange?: (flat: boolean) => void; followAthlete?: boolean; onFollowChange?: (following: boolean) => void;
  distanceTarget?: CourseDistanceTarget | null;
  course: RaceCourse | null; error?: string; onRetry?: () => void; controlsBottom?: number; overlaysHidden?: boolean; optionsTop?: number | null; onReplay?: () => void;
}) {
  if (unit !== "mi" && unit !== "km") return null;
  return <View style={{ flex: 1, minHeight: 0 }}>
    {!mobileEnv.mapboxAccessToken ? <Text style={{ ...textStyle("body"), padding: 16 }}>Mapbox access is not configured for this build.</Text> : !course ?
      <View style={{ flex: 1, minHeight: 0, justifyContent: "center", alignItems: "center", padding: 16, gap: 12, backgroundColor: "#0b242c" }}>
        {!error ? <ActivityIndicator size="large" color={c.tennis} /> : null}
        <Text accessibilityRole={error ? "alert" : undefined} style={[textStyle("body"), { color: "#ffffff" }]}>
          {error || "Loading this competition’s course…"}
        </Text>
        {error && onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 16, backgroundColor: c.card, borderRadius: 12 }}>
            <Text style={textStyle("label")}>Retry</Text>
          </Pressable>
        ) : null}
      </View> :
      <MapBoundary><Suspense fallback={<View style={{ flex: 1, minHeight: 0, justifyContent: "center", alignItems: "center", backgroundColor: "#0b242c" }}><ActivityIndicator size="large" color={c.tennis} /></View>}><CourseMap cardSessionKey={cardSessionKey} initialFlat={initialFlat} onFlatChange={onFlatChange} followAthlete={followAthlete} onFollowChange={onFollowChange} key={course.name + course.length} course={course} replay={replay} onReady={onReady} lanes={lanes} hiddenIds={hiddenIds} unit={unit} selectedId={selectedId} focusRequest={focusRequest} onSelect={onSelect} distanceTarget={distanceTarget} controlsBottom={controlsBottom} overlaysHidden={overlaysHidden} optionsTop={optionsTop} onReplay={onReplay} /></Suspense></MapBoundary>}
  </View>;
}
