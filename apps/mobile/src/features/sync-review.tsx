import { AppText } from "../ui/section";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  clubDuration,
  formatVolume,
  sportById,
  type CompeteState,
  type SportId,
  type SyncReviewReceipt,
} from "@fitness-battle/shared";
import { FocusButton, FocusSheet, f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
export function SyncReview({
  receipt,
  state,
  onComplete,
}: {
  receipt: SyncReviewReceipt;
  state: CompeteState;
  onComplete: () => SportId | undefined;
}) {
  const router = useRouter(),
    [progress, setProgress] = useState(0),
    [width, setWidth] = useState(280),
    complete = useRef(false);
  const latest = useRef({ width, onComplete, router });
  latest.current = { width, onComplete, router };
  const finish = (reveal: boolean) => {
    if (complete.current) return;
    complete.current = true;
    const sport = latest.current.onComplete();
    if (reveal && sport)
      latest.current.router.navigate({
        pathname: "/arena",
        params: { event: sport },
      });
  };
  const travel = Math.max(1, width - 60);
  const dragStart = useRef(0);
  const dragDistance = useRef(0);
  const move = (x: number) => {
    dragDistance.current = Math.max(0, x - dragStart.current);
    setProgress(Math.min(1, dragDistance.current / travel));
  };
  const today = receipt.activities;
  return (
    <FocusSheet
      open
      title={receipt.preview ? "Sample sync preview" : "Today’s effort"}
      body={
        receipt.preview
          ? "Demo/sample preview. Confirming adds no activities or competition points."
          : "Your sync is saved safely. Older activities were applied automatically. Review today’s activity, then reveal your updated field. Closing applies it without the recap."
      }
      onClose={() => finish(false)}
    >
      <Text style={f.kicker}>
        {receipt.preview ? "PREVIEW · NOT A LIVE CONNECTION" : "YOU SHOWED UP"}
      </Text>
      <Text style={[f.massive, { fontSize: 42 }]}>
        {clubDuration(today.reduce((n, a) => n + a.movingSec, 0))}
      </Text>
      <AppText role="body" secondary >
        {today.length} {today.length === 1 ? "activity" : "activities"} from
        today
      </AppText>
      {today.map((a) => (
        <View key={a.id} style={s.row}>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText role="itemTitle" >{sportById(a.sport).name}</AppText>
            <AppText role="supporting" secondary >
              {formatVolume(a.sport, a.distanceM, a.movingSec, state.units)} ·{" "}
              {clubDuration(a.movingSec)}
            </AppText>
          </View>
          <AppText role="caption" secondary style={{ maxWidth: 115, textAlign: "right" }}>
            {receipt.preview
              ? "Preview only"
              : a.verified
                ? "GPS verified"
                : "Open activity"}
          </AppText>
        </View>
      ))}
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={s.swipe}
      >
        <AppText role="itemTitle" style={{ textAlign: "center" }}>
          Swipe to lock it in
        </AppText>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Swipe to confirm today’s synced activities"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(progress * 100),
          }}
          accessibilityActions={[
            { name: "increment", label: "Confirm activities" },
          ]}
          onAccessibilityAction={() => finish(true)}
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            dragStart.current = e.nativeEvent.pageX;
            dragDistance.current = 0;
          }}
          onResponderMove={(e) => move(e.nativeEvent.pageX)}
          onResponderRelease={(e) => {
            const distance = Math.max(
              dragDistance.current,
              e.nativeEvent.pageX - dragStart.current,
            );
            if (distance / travel >= 0.68) finish(true);
            else setProgress(0);
          }}
          onResponderTerminate={() => setProgress(0)}
        >
          <View
            pointerEvents="none"
            style={[
              s.thumb,
              { transform: [{ translateX: progress * travel }] },
            ]}
          >
            <AppText role="controlSymbol" >→</AppText>
          </View>
        </View>
      </View>
      <FocusButton
        label={receipt.preview ? "Finish preview" : "Confirm activities"}
        onPress={() => finish(true)}
      />
      <FocusButton
        secondary
        label={receipt.preview ? "Close preview" : "Apply and skip recap"}
        onPress={() => finish(false)}
      />
    </FocusSheet>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: c.line,
    paddingVertical: 14,
  },
  swipe: {
    height: 60,
    borderRadius: 30,
    backgroundColor: c.soft,
    justifyContent: "center",
    marginTop: 12,
  },
  thumb: {
    position: "absolute",
    left: 4,
    top: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.tennis,
    alignItems: "center",
    justifyContent: "center",
  },
});
