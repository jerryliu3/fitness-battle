import {
  athleteCardHighlightCatalog,
  ATHLETE_CARD_HIGHLIGHT_LIMIT,
  defaultAthleteCardHighlightIds,
  type Action,
  type AthleteCardHighlightKind,
  type AthleteCardHighlightOption,
  type CompeteState,
} from "@fitness-battle/shared";
import { Input } from "heroui-native/input";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { SHELL_RADIUS, useThemeColors } from "../theme";
import { FocusButton, FocusSegments, useFocusStyles } from "../ui/focus";
import { AppText, SectionHeader, textStyle } from "../ui/section";
import { ProfilePhoto } from "./profile-photo";

type FilterKind = "all" | AthleteCardHighlightKind;

export type AthleteProfileDraft = {
  name: string;
  city: string;
  cardHighlights?: string[];
};

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

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/**
 * Option A inline profile editor rendered directly beneath the live 3D Athlete Card.
 * Changes to Name, City, or Row-1 highlights update the 3D card above in real time.
 */
export function AthleteProfileEditor({
  state,
  dispatch,
  onDraftChange,
  onCancel,
  onSaved,
}: {
  state: CompeteState;
  dispatch: (action: Action) => void;
  onDraftChange?: (draft: AthleteProfileDraft) => void;
  onCancel: () => void;
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
    onDraftChange?.({
      name: name.trim() || state.name,
      city: city.trim(),
      cardHighlights: highlights,
    });
  }, [name, city, highlights, state.name, onDraftChange]);

  const catalog = useMemo(() => athleteCardHighlightCatalog(state), [state]);
  const activeIds = useMemo(
    () => highlights ?? defaultAthleteCardHighlightIds(state),
    [highlights, state],
  );
  const visibleCatalog = useMemo(
    () => (filter === "all" ? catalog : catalog.filter((item) => item.kind === filter)),
    [catalog, filter],
  );
  const gridRows = useMemo(() => chunkRows(visibleCatalog, 3), [visibleCatalog]);

  const dirty =
    name.trim() !== state.name ||
    city.trim() !== state.city ||
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
    if (trimmedCity !== state.city) {
      dispatch({ type: "set-city", city: trimmedCity });
    }
    if (JSON.stringify(highlights ?? null) !== JSON.stringify(state.cardHighlights ?? null)) {
      dispatch({ type: "set-card-highlights", cardHighlights: highlights });
    }
    onSaved?.("Profile updated.");
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 12 }}>
        <SectionHeader title="Identity" />
        <View style={[f.row, { gap: 14, alignItems: "center" }]}>
          <ProfilePhoto state={state} editSize={100} />
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
          <AppText role="caption" style={{ color: c.statusError }}>
            {error}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <View style={[f.row, { justifyContent: "space-between", alignItems: "center" }]}>
          <View style={{ flex: 1 }}>
            <SectionHeader
              title={`Card highlights (${activeIds.length}/${ATHLETE_CARD_HIGHLIGHT_LIMIT})`}
              subtitle="Pick up to 3 stats to feature on Row 1 of your card"
            />
          </View>
          {highlights !== undefined ? (
            <Pressable accessibilityRole="button" onPress={() => setHighlights(undefined)}>
              <AppText role="caption" secondary>
                Reset to PBs
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <FocusSegments label="Highlight category" value={filter} options={KIND_FILTERS} onChange={setFilter} />

        {limitHint ? (
          <AppText role="caption" style={{ color: c.statusError }} accessibilityLiveRegion="polite">
            Up to {ATHLETE_CARD_HIGHLIGHT_LIMIT} highlights fit on your card — tap a selected item to swap.
          </AppText>
        ) : null}

        <View style={{ gap: 8 }}>
          {gridRows.map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: "row", gap: 8 }}>
              {row.map((item: AthleteCardHighlightOption) => {
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
                      flex: 1,
                      minWidth: 0,
                      padding: 10,
                      borderRadius: SHELL_RADIUS.card,
                      borderWidth: 1,
                      borderColor: selected ? c.ink : c.line,
                      backgroundColor: selected ? c.actionSoft : c.card,
                      justifyContent: "space-between",
                      gap: 6,
                      opacity: pressed ? 0.78 : atCap ? 0.55 : 1,
                    })}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                      <AppText role="caption" secondary numberOfLines={1}>
                        {KIND_BADGE[item.kind]}
                      </AppText>
                      {order !== null ? (
                        <AppText role="caption" style={{ color: c.ink }}>
                          #{order}
                        </AppText>
                      ) : null}
                    </View>
                    <View style={{ gap: 2 }}>
                      <AppText role="heading" numberOfLines={1}>
                        {item.value}
                      </AppText>
                      <AppText role="caption" numberOfLines={2}>
                        {item.title}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
              {row.length < 3
                ? Array.from({ length: 3 - row.length }).map((_, emptyIndex) => (
                    <View key={`empty-${emptyIndex}`} style={{ flex: 1 }} />
                  ))
                : null}
            </View>
          ))}
        </View>
      </View>

      <View style={[f.row, { gap: 10, paddingTop: 4 }]}>
        <View style={{ flex: 1 }}>
          <FocusButton label="Cancel" secondary onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <FocusButton label={dirty ? "Save" : "Done"} onPress={dirty ? commitAndClose : onCancel} />
        </View>
      </View>
    </View>
  );
}
