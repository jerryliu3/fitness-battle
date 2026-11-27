import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { AccessibilityInfo, Platform, ScrollView, StyleSheet, View } from "react-native";
import { sampleEmberLaunch } from "@fitness-battle/shared/mascot";
import IconBoltFilled from "@tabler/icons-react-native/IconBoltFilled";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  withRepeat,
  interpolate,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { playCue } from "../lib/haptics";
import { useThemeColors } from "../theme";
import { Ember } from "./mascot/ember";
import { AppText } from "./section";
import { useReducedMotion } from "./use-reduced-motion";
import { useRefreshEducation } from "./use-refresh-education";
import { useCompeteStore } from "../lib/compete-store";

const STAGE_HEIGHT = 88;
const ARM_DISTANCE = 68;
const TAKEOFF_MS = 220;
const MIN_HOVER_MS = 620;
const EXIT_MS = 370;
const FLIGHT_STEPS = 8;
// Sample the body shape from the wordmark flight and give it a smaller path here.
const FLIGHT_POSES = Array.from({ length: FLIGHT_STEPS + 1 }, (_, index) =>
  sampleEmberLaunch(0.25 + 0.08 * index / FLIGHT_STEPS, "crest-launch"),
);
const SPARKS = [
  { x: -35, y: -12, angle: 24, size: 8 },
  { x: 29, y: -23, angle: -38, size: 10 },
  { x: 37, y: 8, angle: 15, size: 6 },
  { x: -24, y: 22, angle: -38, size: 6 },
];
const REST = { duration: 240, easing: Easing.out(Easing.cubic) };

type Props = Pick<ComponentProps<typeof ScrollView>, "children" | "contentContainerStyle" | "showsVerticalScrollIndicator"> & {
  onRefresh: () => Promise<unknown>;
  screen: "home" | "compete";
};

export function EmberRefreshScroll(props: Props) {
  if (Platform.OS === "web") {
    const { onRefresh, screen, ...scrollProps } = props;
    return <ScrollView {...scrollProps} />;
  }
  return <NativeRefreshScroll {...props} />;
}

function NativeRefreshScroll({ onRefresh, screen, ...props }: Props) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const { accountKey, hasPendingSyncReview, presentSyncReview } = useCompeteStore();
  const education = useRefreshEducation(screen, accountKey, hasPendingSyncReview);
  const refresh = useRef({ onRefresh, recordPull: education.recordPull });
  refresh.current = { onRefresh, recordPull: education.recordPull };

  const width = useSharedValue(0);
  const offset = useSharedValue(0);
  const reveal = useSharedValue(0);
  const launch = useSharedValue(0);
  const impact = useSharedValue(1);
  const bob = useSharedValue(0);
  const exit = useSharedValue(0);
  const busy = useSharedValue(false);
  const armed = useSharedValue(false);
  const pulling = useSharedValue(false);
  const start = useSharedValue({ x: 0, y: 0 });

  const runRefresh = useCallback(async () => {
    const { onRefresh: perform, recordPull } = refresh.current;
    recordPull();
    AccessibilityInfo.announceForAccessibility("Refreshing");
    const minimumDisplay = new Promise<void>((resolve) => setTimeout(resolve, reduced ? 0 : MIN_HOVER_MS));
    try {
      await perform();
    } catch {
      AccessibilityInfo.announceForAccessibility("Could not refresh");
    } finally {
      await minimumDisplay;
      exit.value = withTiming(1, { duration: reduced ? 0 : EXIT_MS, easing: Easing.linear }, (departed) => {
        if (!departed) return;
        reveal.value = withTiming(0, REST, (finished) => {
          if (!finished) return;
          bob.value = 0;
          launch.value = 0;
          exit.value = 0;
          busy.value = false;
          scheduleOnRN(presentSyncReview, accountKey);
        });
      });
    }
  }, [accountKey, bob, busy, exit, launch, presentSyncReview, reduced, reveal]);

  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
  });
  const scroll = Gesture.Native();
  const pull = Gesture.Pan()
    .manualActivation(true)
    .maxPointers(1)
    .simultaneousWithExternalGesture(scroll)
    .onTouchesDown((event, manager) => {
      if (offset.value > 1 || busy.value || event.numberOfTouches !== 1) {
        manager.fail();
        return;
      }
      const touch = event.allTouches[0];
      start.value = { x: touch.absoluteX, y: touch.absoluteY };
    })
    .onTouchesMove((event, manager) => {
      // Once pulling, let the user reverse direction to disarm before release.
      if (pulling.value) return;
      const touch = event.allTouches[0];
      if (!touch) return;
      const dx = Math.abs(touch.absoluteX - start.value.x);
      const dy = touch.absoluteY - start.value.y;
      if (offset.value > 1 || dy < -6 || (dx > 9 && dx >= dy)) manager.fail();
      else if (dy > 9 && dy > dx * 1.25) manager.activate();
    })
    .onStart(() => { pulling.value = true; })
    .onUpdate((event) => {
      const distance = Math.max(0, event.absoluteY - start.value.y);
      reveal.value = STAGE_HEIGHT * (1 - Math.exp(-distance / 75));
      const nextArmed = reveal.value >= ARM_DISTANCE;
      if (nextArmed && !armed.value) {
        if (!reduced) {
          impact.value = 0;
          impact.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
        }
        scheduleOnRN(playCue, "selection");
      } else if (!nextArmed && armed.value) {
        impact.value = 1;
      }
      armed.value = nextArmed;
    })
    .onFinalize((_event, success) => {
      if (!pulling.value) return;
      pulling.value = false;
      if (success && armed.value) {
        busy.value = true;
        reveal.value = withTiming(STAGE_HEIGHT, { duration: 160 });
        if (!reduced) {
          launch.value = withTiming(1, { duration: TAKEOFF_MS, easing: Easing.out(Easing.cubic) });
          bob.value = withRepeat(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }), -1, true);
        }
        scheduleOnRN(runRefresh);
      } else if (reveal.value > 0) {
        impact.value = 1;
        reveal.value = withTiming(0, REST);
      }
      armed.value = false;
    });

  const aperture = useAnimatedStyle(() => ({ height: reveal.value }));
  const content = useAnimatedStyle(() => ({ transform: [{ translateY: reveal.value }] }));

  return (
    <GestureDetector gesture={pull}>
      <View style={styles.viewport} onLayout={(event) => { width.value = event.nativeEvent.layout.width; }}>
        <Animated.View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.aperture, { backgroundColor: c.actionSoft }, aperture]}
        >
          <LaunchStage
            reveal={reveal}
            launch={launch}
            impact={impact}
            bob={bob}
            exit={exit}
            width={width}
            reduced={reduced}
          />
        </Animated.View>
        <GestureDetector gesture={scroll}>
          <Animated.ScrollView
            {...props}
            style={[styles.scroll, { backgroundColor: c.paper }, content]}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentInsetAdjustmentBehavior="never"
            bounces={false}
            overScrollMode="never"
          />
        </GestureDetector>
        {education.visible && <RefreshHint offset={offset} reveal={reveal} reduced={reduced} />}
      </View>
    </GestureDetector>
  );
}

function RefreshHint({ offset, reveal, reduced }: {
  offset: SharedValue<number>;
  reveal: SharedValue<number>;
  reduced: boolean;
}) {
  const c = useThemeColors();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(withTiming(3, { duration: 550, easing: Easing.inOut(Easing.sin) }), 4, true);
  }, [bob, reduced]);
  const motion = useAnimatedStyle(() => ({
    opacity: offset.value > 1 ? 0 : Math.max(0, 1 - reveal.value / 6),
    transform: [{ translateY: bob.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.hint, { backgroundColor: c.paper }, motion]}
    >
      <AppText role="caption" secondary>↓ Pull to refresh</AppText>
    </Animated.View>
  );
}

function LaunchStage({ reveal, launch, impact, bob, exit, width, reduced }: {
  reveal: SharedValue<number>;
  launch: SharedValue<number>;
  impact: SharedValue<number>;
  bob: SharedValue<number>;
  exit: SharedValue<number>;
  width: SharedValue<number>;
  reduced: boolean;
}) {
  const c = useThemeColors();
  // Keep vector pose updates local. The fall, hover and exit run on the UI thread.
  const [flightStep, setFlightStep] = useState(0);
  useAnimatedReaction(
    () => Math.round(launch.value * FLIGHT_STEPS),
    (step, previous) => {
      if (step !== previous) scheduleOnRN(setFlightStep, step);
    },
  );

  const bolt = useAnimatedStyle(() => ({
    opacity: reveal.value < ARM_DISTANCE && exit.value === 0 ? 1 : 0,
  }));
  const pulse = useAnimatedStyle(() => ({
    opacity: interpolate(impact.value, [0, 0.16, 1], [0, 0.7, 0]),
    transform: [{ scale: interpolate(impact.value, [0, 1], [0.56, 1.48]) }],
  }));
  const flyer = useAnimatedStyle(() => {
    const drop = reduced ? 0 : interpolate(reveal.value, [35, ARM_DISTANCE], [-57, 0], Extrapolation.CLAMP);
    const appear = interpolate(
      reveal.value,
      reduced ? [ARM_DISTANCE - 2, ARM_DISTANCE] : [35, 48],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const spring = interpolate(impact.value, [0, 0.25, 0.55, 1], [0.88, 1.08, 0.98, 1]);
    const lift = launch.value * (6 + 6 * bob.value);
    return {
      opacity: appear * interpolate(exit.value, [0, 0.79, 1], [1, 1, 0]),
      transform: [
        { translateX: (width.value / 2 + 56) * exit.value ** 1.8 },
        { translateY: drop - lift - 16 * exit.value },
        { rotate: `${launch.value * (3 - 6 * bob.value) - 8 * exit.value}deg` },
        { scaleY: launch.value + (1 - launch.value) * spring },
      ],
    };
  });
  const trail = useAnimatedStyle(() => ({
    opacity: launch.value * (0.6 + 0.25 * bob.value + 0.15 * exit.value),
    transform: [{ scaleX: 0.78 + 0.24 * bob.value + 0.55 * exit.value }],
  }));

  const { flight, pose } = FLIGHT_POSES[flightStep];
  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.bolt, bolt]}>
        <IconBoltFilled size={22} color={c.gold} />
      </Animated.View>
      <Animated.View style={[styles.pulse, { borderColor: c.actionPressed }, pulse]} />
      <Animated.View style={[styles.flyer, flyer]}>
        <Animated.View style={[styles.trail, trail]}>
          <View style={[styles.longStreak, { backgroundColor: c.gold }]} />
          <View style={[styles.shortStreak, { backgroundColor: c.actionPressed }]} />
        </Animated.View>
        <Ember
          size={50}
          shadow={false}
          morphConcept="crest-launch"
          launchCrouch={1 - flight}
          launchFlight={flight}
          pose={{ ...pose, lookX: 0.65, trail: 0.45 * flight }}
        />
      </Animated.View>
      {SPARKS.map((spark) => <ImpactSpark key={spark.angle + spark.x} {...spark} impact={impact} color={c.actionPressed} />)}
    </View>
  );
}

function ImpactSpark({ x, y, angle, size, impact, color }: {
  x: number;
  y: number;
  angle: number;
  size: number;
  impact: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = impact.value;
    return {
      opacity: interpolate(t, [0, 0.18, 1], [0, 1, 0]),
      transform: [
        { translateX: x * (0.45 + 0.65 * t) },
        { translateY: y * (0.45 + 0.65 * t) + 8 * t * t },
        { rotate: `${angle}deg` },
        { scaleX: 1 - 0.5 * t },
      ],
    };
  });
  return <Animated.View style={[styles.spark, { width: size, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: "hidden" },
  scroll: { flex: 1 },
  aperture: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  stage: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: STAGE_HEIGHT, alignItems: "center", justifyContent: "center",
  },
  hint: { position: "absolute", top: 0, alignSelf: "center", paddingHorizontal: 6 },
  bolt: { position: "absolute" },
  pulse: { position: "absolute", width: 44, height: 44, borderRadius: 22, borderWidth: 1.5 },
  flyer: { justifyContent: "center", alignItems: "center", marginTop: -17 },
  trail: { position: "absolute", right: 38, top: 39, alignItems: "flex-end", gap: 5 },
  longStreak: { width: 31, height: 2, borderRadius: 1 },
  shortStreak: { width: 17, height: 2, borderRadius: 1, marginRight: 6 },
  spark: { position: "absolute", height: 2.5, borderRadius: 2 },
});
