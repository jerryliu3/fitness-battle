import { Toast } from "../ui/toast";
import { playCue } from "../lib/haptics";
import { AppText } from "../ui/section";
import { IconButton } from "../ui/icon-button";
import { NumberPicker, DateTimeField } from "../ui/form-picker";
import { ChoicePicker } from "../ui/choice-picker";

import {
  accountTimeZone,
  parseManualActivity,
  manualActivityInstant,
  competeNow,
  SPORTS,
  sportById,
  type SportId,
} from "@fitness-battle/shared";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { FocusButton, FocusSheet } from "../ui/focus";
import { AnchoredMenu, AnchoredMenuItem, useAnchoredMenu } from "../ui/anchored-menu";
import { SportIcon } from "../ui/sport-icon";

export function HomeActivityActions({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { state, canWrite, canWriteLocal, dispatch } = useCompeteStore();
  const canLogLocal = canWriteLocal ?? canWrite;
  const { user } = useAuth();
  const [open, setOpen] = useState(false),
    [note, setNote] = useState("");
  const sportMenu = useAnchoredMenu({ minWidth: 196, estimatedHeight: SPORTS.length * 46 + 12 });
  const [formError, setFormError] = useState("");
  const [sport, setSport] = useState<SportId | "">("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [miles, setMiles] = useState(""),
    [minutes, setMinutes] = useState("");
  useEffect(() => setNote(""), [user?.id]);
  const pendingSheetOpen = useRef(false);
  if (!state) return null;
  return (
    <View style={{ gap: 10 }}>
      <View ref={sportMenu.anchorRef} collapsable={false}>
        {compact ? (
          <IconButton icon="plus" label="Add activity" disabled={!user || !canLogLocal} onPress={sportMenu.toggle} />
        ) : (
          <FocusButton secondary label="Add activity" disabled={!user || !canLogLocal} onPress={sportMenu.toggle} />
        )}
      </View>
      {!user && !compact && <Link href="/athlete">Sign in to add activities</Link>}
      <Toast message={note} onDismiss={() => setNote("")} />
      <AnchoredMenu
        open={sportMenu.open}
        onClose={() => {
          pendingSheetOpen.current = false;
          sportMenu.close();
        }}
        onDismiss={() => {
          if (!pendingSheetOpen.current) return;
          pendingSheetOpen.current = false;
          setOpen(true);
        }}
        menuLayout={sportMenu.menuLayout}
        accessibilityLabel="Close sport menu"
      >
        {SPORTS.map(item => (
          <AnchoredMenuItem
            key={item.id}
            label={item.name}
            left={<SportIcon sport={item.id} size={18} />}

            onPress={() => {
              void playCue("selection");
              setSport(item.id);
              setMiles("");
              setFormError("");
              pendingSheetOpen.current = true;
              sportMenu.close();
            }}
          />
        ))}
      </AnchoredMenu>
      <FocusSheet
        open={open}
        onClose={() => setOpen(false)}
        title={sport ? `Add ${sportById(sport).name} activity` : "Add manual activity"}
        minimal
      >
        <ChoicePicker systemMenu label="Sport" placeholder="Choose a sport" value={sport} options={SPORTS.map(item => ({ value: item.id, label: item.name }))} onChange={value => { setSport(value); setMiles(""); }} />
        {sport && <>
          <AppText role="label" >Duration</AppText>
          <NumberPicker label="Duration" unit="min" value={minutes} onChange={setMinutes} />
          {sportById(sport).gps && <><AppText role="label" >Distance ({state.units === "metric" ? "km" : "mi"})</AppText>
            <NumberPicker label="Distance" unit={state.units === "metric" ? "km" : "mi"} max={1000} step={0.1} value={miles} onChange={setMiles} /></>}
          <AppText role="label" >Date (optional)</AppText>
          <DateTimeField label="Date" mode="date" value={date} onChange={setDate} clearLabel="Use today" />
          <AppText role="label" >Time of day (optional)</AppText>
          <DateTimeField label="Time of day" mode="time" value={time} onChange={setTime} clearLabel="Use current time" />
        </>}
        {formError ? (
          <AppText role="body" secondary  accessibilityRole="alert">
            {formError}
          </AppText>
        ) : null}
        <FocusButton
          disabled={!user || !canLogLocal || !sport}
          label="Save activity"
          onPress={() => {
            if (!user || !canLogLocal || !sport) return;
            const parsed = parseManualActivity(sport, miles, minutes, state.units);
            if (parsed.error !== null) {
              void playCue("error");
              setFormError(parsed.error);
              return;
            }
            const when = manualActivityInstant(time, competeNow(state), accountTimeZone(state), date);
            if (when.error !== null) { setFormError(when.error); return; }
            const { movingSec, distanceM } = parsed;
            dispatch({
              type: "log-manual",
              sport,
              movingSec,
              distanceM,
              startedAt: when.startedAt,
              activityId: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            });
            setOpen(false);
            setMiles("");
            setMinutes("");
            setDate("");
            setTime("");
            setSport("");
            setNote(date ? "Activity added." : "Activity added for today.");
          }}
        />
      </FocusSheet>
    </View>
  );
}
