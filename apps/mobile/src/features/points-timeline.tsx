import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  buildCompeteTimeSeriesModel,
  buildSleepTimeSeriesModel,
  competeNow,
  competitionTrack,
  REPLAY_MINUTES_PER_REAL_SECOND_1X,
  type CompeteEvent,
  type CompeteState,
} from "@fitness-battle/shared";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { AppText, textStyle } from "../ui/section";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { ReplayTimeline } from "./replay-timeline";

export function PointsTimeline({
  state,
  event,
  fraction,
  onChange,
}: {
  state: CompeteState;
  event: CompeteEvent;
  fraction: number | null;
  onChange(value: number | null): void;
}) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const now = competeNow(state);
  const { blocks } = useAthleteBlocks();
  const hiddenIds = blocks.map((block) => block.id);
  const model =
    event === "sleep"
      ? buildSleepTimeSeriesModel(state, now, { scrubFraction: fraction, hiddenIds })
      : buildCompeteTimeSeriesModel(state, event, competitionTrack(event), now, { scrubFraction: fraction, hiddenIds });

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  const count = model.nowFraction > 0 ? 1000 : 0;
  const cursor =
    model.nowFraction > 0
      ? (model.cursorFraction / model.nowFraction) * count
      : 0;

  const fractionRef = useRef(fraction);
  fractionRef.current = fraction;
  const nowFractionRef = useRef(model.nowFraction);
  nowFractionRef.current = model.nowFraction;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!playing || model.nowFraction <= 0) return;
    let raf = 0;
    const start = Date.now();
    const startFraction = fractionRef.current ?? 0;
    const spanMinutes = Math.max(1, (model.spanMs || (7 * 24 * 60 * 60 * 1000)) / 60_000);
    const fractionPerMs = (REPLAY_MINUTES_PER_REAL_SECOND_1X * speed) / (spanMinutes * 1000);
    let lastPaint = -Infinity;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = startFraction + elapsed * fractionPerMs;
      const nowMs = Date.now();
      if (nowMs - lastPaint >= 60 || progress >= nowFractionRef.current) {
        lastPaint = nowMs;
        if (progress >= nowFractionRef.current) {
          onChangeRef.current(null);
          setPlaying(false);
          return;
        }
        onChangeRef.current(reduced ? Math.round(progress * 100) / 100 : progress);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, reduced, model.nowFraction, model.spanMs]);

  const toggle = () => {
    if (!count) return;
    if (!playing && (fraction === null || (model.nowFraction > 0 && model.cursorFraction >= model.nowFraction - 1e-4))) {
      onChange(0);
    }
    setPlaying((p) => !p);
  };

  const seek = (val: number) => {
    setPlaying(false);
    onChange(val >= count ? null : (Math.max(0, val) / count) * model.nowFraction);
  };

  const changeSpeed = () => {
    setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1));
  };

  if (!model.historyAvailable) {
    return <AppText role="caption" secondary>Race history is not available yet.</AppText>;
  }

  return (
    <View onTouchStart={(e) => e.stopPropagation()} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause replay" : "Play replay"}
          disabled={!count}
          onPress={toggle}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.ink,
            alignItems: "center",
            justifyContent: "center",
            opacity: count ? 1 : 0.4,
          }}
        >
          <AppIcon name={playing ? "pause" : "play"} size={20} color={c.paper} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ReplayTimeline
            timeBased
            label="Competition timeline"
            caption={model.cursorTimeLabel}
            count={count}
            cursor={cursor}
            onSeek={seek}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${speed} times`}
          onPress={changeSpeed}
          style={{
            width: 48,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              ...textStyle("label"),
              color: c.ink,
              fontVariant: ["tabular-nums"],
            }}
          >
            {speed}×
          </Text>
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingLeft: 52,
        }}
      >
        <AppText role="caption" secondary style={{ flex: 1 }}>
          {model.cursorTimeLabel}
        </AppText>
        <AppText role="caption" secondary style={{ flexShrink: 1, textAlign: "right" }}>
          Now
        </AppText>
      </View>
    </View>
  );
}
