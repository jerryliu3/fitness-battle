import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WEEK_RECAP_COLORS, type CompeteState, type CompetitionReplaySelection } from "@fitness-battle/shared";
import { useAppTheme, useThemeColors } from "../theme";
import { useAuth } from "../lib/auth";
import { playCue } from "../lib/haptics";
import { AppIcon } from "../ui/app-icon";
import { CompeteSheet } from "../ui/compete-sheet";
import { FocusButton, useFocusStyles } from "../ui/focus";
import { AppText } from "../ui/section";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { CompetitionField } from "./competition-field";
import { CompetitionPanel } from "./competition-panel";
import { CompetitionTimelineControls, CompetitionTimelineProvider } from "./competition-timeline-context";
import { RaceUpdates } from "./race-updates";

export function CompetitionReplayButton({
  state,
  selection,
  label = "Replay competition",
  variant = "button",
  secondary = true,
}: {
  state: CompeteState;
  selection: CompetitionReplaySelection;
  label?: string;
  variant?: "button" | "inline" | "link" | "recap";
  secondary?: boolean;
}) {
  const appearanceColors = useThemeColors();
  const [open, setOpen] = useState(false);
  const openReplay = () => {
    void playCue("light");
    setOpen(true);
  };
  const compactVariant = variant !== "button";
  const textLabel = label || (variant === "link" || variant === "recap" ? "Replay round" : "View replay");

  return (
    <>
      {compactVariant ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={textLabel}
          onPress={openReplay}
          style={({ pressed }) => [
            variant === "link"
              ? { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, paddingHorizontal: 14 }
              : variant === "recap"
                ? { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48, borderRadius: 999, paddingHorizontal: 16, backgroundColor: "rgba(255, 255, 255, 0.09)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.22)" }
                : { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 34, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(20, 20, 19, 0.78)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.2)" },
            pressed && { opacity: 0.75 },
          ]}
        >
          {variant !== "recap" && (
            <AppIcon name="replay" size={variant === "link" ? 16 : 14} color={variant === "link" ? WEEK_RECAP_COLORS.text : appearanceColors.white} />
          )}
          <AppText
            role={variant === "link" || variant === "recap" ? "label" : "caption"}
            style={{ color: variant === "link" || variant === "recap" ? WEEK_RECAP_COLORS.text : appearanceColors.white, opacity: variant === "link" ? 0.9 : 1 }}
          >
            {textLabel}
          </AppText>
        </Pressable>
      ) : (
        <FocusButton secondary={secondary} label={label} onPress={openReplay} />
      )}
      <CompetitionReplayModal open={open} state={state} selection={selection} onClose={() => setOpen(false)} />
    </>
  );
}

export function CompetitionReplayModal({
  open,
  state,
  selection,
  onClose,
}: {
  open: boolean;
  state: CompeteState;
  selection: CompetitionReplaySelection;
  onClose(): void;
}) {
  const { mode } = useAppTheme();
  const { user } = useAuth();
  const reduced = useReducedMotion();

  if (!open) return null;
  return (
    <Modal visible animationType={reduced ? "none" : "fade"} presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <RoundReplayBody
          key={`${user?.id ?? "guest"}:${selection.sport}:${selection.track}:${selection.periodStart}:${selection.periodEnd}`}
          state={state}
          selection={selection}
          onClose={onClose}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

function RoundReplayBody({
  state,
  selection,
  onClose,
}: {
  state: CompeteState;
  selection: CompetitionReplaySelection;
  onClose(): void;
}) {
  const f = useFocusStyles();
  const insets = useSafeAreaInsets();
  const [courseOptions, setCourseOptions] = useState<ReactNode>(null);
  const [athleteFocus, setAthleteFocus] = useState<{ id: string; request: number } | null>(null);
  const periodOverride = {
    startsAt: new Date(selection.periodStart),
    endsAt: new Date(selection.periodEnd),
  };

  return (
    <CompetitionTimelineProvider state={state} selection={selection} enabled active replay>
      <SafeAreaView pointerEvents="box-none" style={[f.safe, { backgroundColor: "transparent" }]} edges={[]}>
        <CompetitionField
          sport={selection.sport}
          track={selection.track}
          periodOverride={periodOverride}
          focusedOverride
          persistent
          backgroundMode
          externalAthleteFocus={athleteFocus}
          onOptionsChange={setCourseOptions}
          presentationActive
          onExit={onClose}
        />
        <View style={{ position: "absolute", top: insets.top + 54, right: 16, zIndex: 20 }}>
          {courseOptions}
        </View>
        <CompeteSheet
          scrollable
          active
          expandRequest={0}
          defaultIndex={0}
          overview={<CompetitionTimelineControls floating />}
        >
          <CompetitionPanel
            active
            standings={
              <CompetitionField
                sport={selection.sport}
                track={selection.track}
                periodOverride={periodOverride}
                focusedOverride
                standingsOnly
                onFocusAthlete={(id) => {
                  setAthleteFocus((previous) => ({ id, request: (previous?.request ?? 0) + 1 }));
                }}
              />
            }
            activity={(visible) => <RaceUpdates state={state} sport={selection.sport} active={visible} />}
          />
        </CompeteSheet>
      </SafeAreaView>
    </CompetitionTimelineProvider>
  );
}
