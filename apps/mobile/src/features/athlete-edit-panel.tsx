import {
  athleteCardHighlightCatalog,
  athleteCardModel,
  ATHLETE_CARD_HIGHLIGHT_LIMIT,
  defaultAthleteCardHighlightIds,
  type Action,
  type AthleteCardHighlightKind,
  type CompeteState,
} from "@fitness-battle/shared";
import { Input } from "heroui-native/input";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { SHELL_RADIUS, useThemeColors } from "../theme";
import { FocusButton, FocusSegments, FocusSidePanel, useFocusStyles } from "../ui/focus";
import { AppText, SectionHeader, textStyle } from "../ui/section";
import { ProfilePhoto } from "./profile-photo";

type FilterKind = "all" | AthleteCardHighlightKind;

const KIND_FILTERS: { value: FilterKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "record", label: "PBs" },
  { value: "achievement", label: "Badges" },
  { value: "stat", label: "Stats" },
];

const KIND_BADGE: Record<AthleteCardHighlightKind, string> = {
  record: "PB",
  achievement: "Badge",
  stat: "Stat",
};

/**
 * Goalmaxxing-inspired profile editor: edits identity fields plus up to 3
 * Row-1 highlights on the physical Athlete Card (while keeping Overtakes /
 * Rounds / Week streak fixed on Row 2).
 */
export function AthleteEditPanel({
  open,
  state,
  dispatch,
  onClose,
  onSaved,
}: {
  open: boolean;
  state: CompeteState;
  dispatch: (action: Action) => void;
  onClose: () => void;
  onSaved?: (message: string) => void;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const [name, setName] = useState(state.name);
  const [city, setCity] = useState(state.city);
  const [highlights, setHighlights] = useState<string[] | undefined>(state.cardHighlights);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [error, setError] = useState<string | null>(null);
  const [limitHint, setLimitHint] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(state.name);
    setCity(state.city);
    setHighlights(state.cardHighlights);
    setError(null);
    setLimitHint(false);
  }, [open, state.name, state.city, state.cardHighlights]);

  const catalog = useMemo(() => athleteCardHighlightCatalog(state), [state]);

  // Reflect what Row 1 currently resolves to in the draft state.
  const previewState = useMemo<CompeteState>(
    () => ({ ...state, cardHighlights: highlights }),
    [state, highlights],
  );
  const previewModel = useMemo(() => athleteCardModel(previewState), [previewState]);
  const activeIds = useMemo(
    () => highlights ?? defaultAthleteCardHighlightIds(state),
    [highlights, state],
  );

  const visibleCatalog = useMemo(
    () => (filter === "all" ? catalog : catalog.filter((item) => item.kind === filter)),
    [catalog, filter],
  );

  const dirty =
    name.trim() !== state.name ||
    (city.trim() !== "" && city.trim() !== state.city) ||
    JSON.stringify(highlights ?? null) !== JSON.stringify(state.cardHighlights ?? null);

  function toggleHighlight(id: string) {
    setLimitHint(false);
    setHighlights((prev) => {
      const current = prev ?? activeIds;
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      if (current.length >= ATHLETE_CARD_HIGHLIGHT_LIMIT) {
        setLimitHint(true);
        return current;
      }
      return [...current, id];
    });
  }

  function commitAndClose() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Display name cannot be empty.");
      return;
    }
    if (trimmedName !== state.name) {
      dispatch({ type: "rename", name: trimmedName });
    }
    const trimmedCity = city.trim();
    if (trimmedCity && trimmedCity !== state.city) {
      dispatch({ type: "set-city", city: trimmedCity });
    }
    if (JSON.stringify(highlights ?? null) !== JSON.stringify(state.cardHighlights ?? null)) {
      dispatch({ type: "set-card-highlights", cardHighlights: highlights });
    }
    onSaved?.("Profile updated.");
    onClose();
  }

  return (
    <FocusSidePanel open={open} title="Edit profile" onClose={onClose}>
      <View style={{ gap: 16, paddingBottom: 24 }}>
        <View style={{ gap: 12 }}>
          <SectionHeader title="Identity" />
          <View style={[f.row, { gap: 16, alignItems: "center" }]}>
            <ProfilePhoto state={state} />
            <View style={{ flex: 1, gap: 8 }}>
              <Input
                style={textStyle("body")}
                value={name}
                onChangeText={setName}
                accessibilityLabel="Name"
                maxLength={32}
                placeholder="Name"
              />
              <Input
                style={textStyle("body")}
                value={city}
                onChangeText={setCity}
                accessibilityLabel="City"
                maxLength={40}
                placeholder="City"
              />
            </View>
          </View>
          {error ? (
            <AppText role="caption" style={{ color: c.danger }}>
              {error}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          <View style={[f.row, { justifyContent: "space-between", alignItems: "center" }]}>
            <SectionHeader
              title="Card highlights"
              subtitle="Choose up to 3 items for Row 1. Overtakes, Rounds & Streak stay locked below."
            />
          </View>

          <View
            style={{
              borderRadius: SHELL_RADIUS.md,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.surfaceInverse,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={[f.row, { justifyContent: "space-between", alignItems: "center" }]}>
              <AppText role="caption" style={{ color: c.textOnFeatureMuted }}>
                ROW 1 PREVIEW · {activeIds.length}/{ATHLETE_CARD_HIGHLIGHT_LIMIT} ON CARD
              </AppText>
              {highlights !== undefined ? (
                <Pressable accessibilityRole="button" onPress={() => setHighlights(undefined)}>
                  <AppText role="caption" style={{ color: c.tennis }}>
                    Reset to PBs
                  </AppText>
                </Pressable>
              ) : null}
            </View>
            {previewModel.records.length > 0 ? (
              <View style={[f.row, { gap: 8 }]}>
                {previewModel.records.slice(0, ATHLETE_CARD_HIGHLIGHT_LIMIT).map((slot) => (
                  <View
                    key={slot.id ?? slot.label}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: SHELL_RADIUS.sm,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      gap: 2,
                    }}
                  >
                    <AppText role="metric" numberOfLines={1} style={{ color: c.textOnFeature, fontSize: 16 }}>
                      {slot.value}
                    </AppText>
                    <AppText role="caption" numberOfLines={1} style={{ color: c.textOnFeatureMuted }}>
                      {!slot.kind || slot.kind === "record" ? `${slot.label} PB` : slot.label}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : (
              <AppText role="caption" style={{ color: c.textOnFeatureMuted }}>
                No highlights selected — tap any item below to feature it.
              </AppText>
            )}
          </View>

          <FocusSegments label="Highlight category" value={filter} options={KIND_FILTERS} onChange={setFilter} />

          {limitHint ? (
            <AppText role="caption" style={{ color: c.accent }} accessibilityLiveRegion="polite">
              Up to {ATHLETE_CARD_HIGHLIGHT_LIMIT} highlights fit on your card — tap a selected item to swap.
            </AppText>
          ) : null}

          <View style={{ gap: 8 }}>
            {visibleCatalog.map((item) => {
              const selected = activeIds.includes(item.id);
              const atCap = !selected && activeIds.length >= ATHLETE_CARD_HIGHLIGHT_LIMIT;
              const order = selected ? activeIds.indexOf(item.id) + 1 : null;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleHighlight(item.id)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: SHELL_RADIUS.md,
                    borderWidth: 1,
                    borderColor: selected ? c.ink : c.line,
                    backgroundColor: selected ? c.surfaceSubtle : c.card,
                    opacity: pressed ? 0.78 : atCap ? 0.62 : 1,
                  })}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={[f.row, { gap: 8, alignItems: "center" }]}>
                      <AppText role="label">{item.title}</AppText>
                      <AppText role="caption" secondary>
                        {KIND_BADGE[item.kind]}
                      </AppText>
                    </View>
                    <AppText role="caption" secondary>
                      {item.detail}
                    </AppText>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <AppText role="label">{item.value}</AppText>
                    {order !== null ? (
                      <AppText role="caption" style={{ color: c.ink, fontWeight: "700" }}>
                        Slot {order}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[f.row, { gap: 10, paddingTop: 4 }]}>
          <View style={{ flex: 1 }}>
            <FocusButton label="Cancel" secondary onPress={onClose} />
          </View>
          <View style={{ flex: 1 }}>
            <FocusButton label={dirty ? "Save" : "Done"} onPress={dirty ? commitAndClose : onClose} />
          </View>
        </View>
      </View>
    </FocusSidePanel>
  );
}
