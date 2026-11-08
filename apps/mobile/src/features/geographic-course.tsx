import { useEffect, useRef, useState } from "react";
import { useBootLoading } from "../ui/boot-readiness";
import { useThemeColors } from "../theme";
import { Component, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { type CourseReplayFrame, type CourseDistanceTarget, type RaceCourse, type ArenaSceneLane } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { textStyle } from "../ui/section";


import { DeferredCourseMap as CourseMap, nativeCourseMapAvailable } from "./deferred-course-map";
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean; missingNative: boolean }> {
  state = { failed: false, missingNative: false };
  static getDerivedStateFromError(error: Error) { return { failed: true, missingNative: /(?:RNMBX|RNMapbox).*(?:not found|not registered|not available)|native module.*(?:null|not found)|TurboModuleRegistry.*(?:RNMBX|RNMapbox)/i.test(error.message) }; }
  render() { return this.state.failed ? <Text style={textStyle("body")}>{this.state.missingNative ? "This app build is missing native map support. Install the latest build." : "This course could not open. Return to Compete and try again."}</Text> : this.props.children; }
}

/** Presentation-only scene. The field/replay host owns the weekly course. */
export function GeographicCourse({ presentationActive = true, cardSessionKey, initialFlat, onFlatChange, onFollowChange, followAthlete, onReady, onSnapshot, replay, lanes, hiddenIds = [], unit, selectedId, focusRequest, onSelect, course, error = "", onRetry, controlsBottom = 8, overlaysHidden = false, optionsTop, onReplay, onChoose2D, onOptionsChange, distanceTarget }: {
  presentationActive?: boolean;
  onReady?: () => void; onSnapshot?: (uri: string) => void; replay?: CourseReplayFrame; hiddenIds?: readonly string[]; lanes: ArenaSceneLane[]; unit: string; selectedId: string; focusRequest: number; onSelect(id: string): void;
  cardSessionKey?: string | number | boolean;
  initialFlat?: boolean; onFlatChange?: (flat: boolean) => void; followAthlete?: boolean; onFollowChange?: (following: boolean) => void;
  distanceTarget?: CourseDistanceTarget | null;
  course: RaceCourse | null; error?: string; onRetry?: () => void; controlsBottom?: number; overlaysHidden?: boolean; optionsTop?: number | null; onReplay?: () => void; onChoose2D?: () => void; onOptionsChange?: (options: ReactNode | null) => void;
}) {
const appearanceColors = useThemeColors();

const c=useThemeColors();
  const preparation = useRef({ expired: false, attempt: 0 });
  const [settled, setSettled] = useState(false);
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useBootLoading(nativeCourseMapAvailable && !onSnapshot && Boolean(mobileEnv.mapboxAccessToken) && !settled && !expired && !error);
  useEffect(() => {
    if (!nativeCourseMapAvailable || !presentationActive || !course || settled || !mobileEnv.mapboxAccessToken || error) return;
    const timer = setTimeout(() => { preparation.current.expired = true; setExpired(true); }, 12000);
    return () => clearTimeout(timer);
  }, [attempt, error, presentationActive, course, settled]);
  const prepared = () => { if (preparation.current.attempt !== attempt) return; setSettled(true); onReady?.(); };

  if (unit !== "mi" && unit !== "km") return null;
  return <View style={{ flex: 1, minHeight: 0 }}>
    {!mobileEnv.mapboxAccessToken ? <Text style={{ ...textStyle("body"), padding: 16 }}>Mapbox access is not configured for this build.</Text> : !course ?
      <View style={{ flex: 1, minHeight: 0, justifyContent: "center", alignItems: "center", padding: 16, gap: 12, backgroundColor: "#0b242c" }}>
        {!error ? <ActivityIndicator size="large" color={c.tennis} /> : null}
        <Text accessibilityRole={error ? "alert" : undefined} style={[textStyle("body"), { color: appearanceColors.white }]}>
          {error || "Loading this competition’s course…"}
        </Text>
        {error && onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 16, backgroundColor: c.card, borderRadius: 12 }}>
            <Text style={textStyle("label")}>Retry</Text>
          </Pressable>
        ) : null}
      </View> :
      <MapBoundary key={attempt}><CourseMap presentationActive={presentationActive} cardSessionKey={cardSessionKey} initialFlat={initialFlat} onFlatChange={onFlatChange} followAthlete={followAthlete} onFollowChange={onFollowChange} key={course.name + course.length + ":" + attempt} course={course} replay={replay} onReady={prepared} onSnapshot={onSnapshot} lanes={lanes} hiddenIds={hiddenIds} unit={unit} selectedId={selectedId} focusRequest={focusRequest} onSelect={onSelect} distanceTarget={distanceTarget} controlsBottom={controlsBottom} overlaysHidden={overlaysHidden} optionsTop={optionsTop} onReplay={onReplay} onChoose2D={onChoose2D} onOptionsChange={onOptionsChange} /></MapBoundary>}
    {expired && !settled && <View style={{ position: "absolute", bottom: 16, left: 16, right: 16, padding: 16, backgroundColor: c.card, borderRadius: 14 }}><Text style={textStyle("body")}>The field could not finish loading.</Text><Pressable accessibilityRole="button" onPress={() => { preparation.current = { expired: false, attempt: attempt + 1 }; setExpired(false); setAttempt(value => value + 1); onRetry?.(); }}><Text style={textStyle("label")}>Retry field</Text></Pressable></View>}

  </View>;
}
