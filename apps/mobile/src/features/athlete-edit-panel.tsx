import {
  athleteCardHighlightCatalog,
  ATHLETE_CARD_HIGHLIGHT_LIMIT,
  defaultAthleteCardHighlightIds,
  type Action,
  type AthleteCardHighlightKind,
  type AthleteCardHighlightOption,
  type CompeteState,
  type ProfileGender,
} from "@fitness-battle/shared";
import { TextField } from "../ui/text-field";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Pressable, View, type TextInput } from "react-native";
import { SHELL_RADIUS, useThemeColors } from "../theme";
import { ChoicePicker } from "../ui/choice-picker";
import { FocusButton, FocusSegments, useFocusStyles } from "../ui/focus";
import { AppText, SectionHeader } from "../ui/section";
import { CountryPicker } from "../ui/country-picker";
import { ProfilePhoto } from "./profile-photo";

type FilterKind = "all" | AthleteCardHighlightKind;

export type AthleteProfileDraft = {
  name: string;
  city: string;
  cardHighlights?: string[];
  gender?: ProfileGender | null;
  countryCode?: string | null;
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
  const [gender, setGender] = useState<ProfileGender | null>(state.gender ?? null);
  const [countryCode, setCountryCode] = useState(state.countryCode ?? "");
  const [highlights, setHighlights] = useState<string[] | undefined>(state.cardHighlights);
  const [filter, setFilter] = useState<FilterKind>("all");
  const nameField = useRef<ComponentRef<typeof TextInput>>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitHint, setLimitHint] = useState(false);

  useEffect(() => {
    onDraftChange?.({
      name: name.trim() || state.name,
      city: city.trim(),
      cardHighlights: highlights,
      gender,
      countryCode: countryCode || null,
    });
  }, [name, city, gender, countryCode, highlights, state.name, onDraftChange]);

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
    gender !== (state.gender ?? null) ||
    (countryCode || null) !== (state.countryCode ?? null);

  function saveHighlights(next: string[] | undefined) {
    setHighlights(next);
    dispatch({ type: "set-card-highlights", cardHighlights: next });
  }

  function toggleHighlight(id: string) {
    setLimitHint(false);
    if (activeIds.includes(id)) {
      saveHighlights(activeIds.filter((item) => item !== id));
    } else if (activeIds.length >= ATHLETE_CARD_HIGHLIGHT_LIMIT) {
      setLimitHint(true);
    } else {
      saveHighlights([...activeIds, id]);
    }
  }

  function commitAndClose() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Display name cannot be empty.");
      nameField.current?.focus();
      return;
    }
    if (trimmedName !== state.name) {
      dispatch({ type: "rename", name: trimmedName });
    }
    const trimmedCity = city.trim();
    if (trimmedCity !== state.city) {
      dispatch({ type: "set-city", city: trimmedCity });
    }
    if (gender !== (state.gender ?? null)) {
      dispatch({ type: "set-gender", gender });
    }
    if ((countryCode || null) !== (state.countryCode ?? null)) {
      dispatch({ type: "set-country", countryCode: countryCode || null });
    }
    onSaved?.("Profile updated.");
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 12 }}>
        <View style={[f.row, { gap: 14, alignItems: "center" }]}>
          <ProfilePhoto state={state} editSize={100} />
          <View style={{ flex: 1, gap: 8 }}>
            <TextField
              ref={nameField}
              label="Name"
              value={name}
              onChangeText={value => { setName(value); setError(null); }}
              maxLength={32}
              error={error}
            />
            <TextField label="City (optional)" value={city} onChangeText={setCity} maxLength={40} />
            <ChoicePicker
              label="Gender (optional)"
              value={gender ?? ""}
              placeholder="Gender (optional)"
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "other", label: "Other" },
              ]}
              onChange={(value) => setGender(value ? (value as ProfileGender) : null)}
            />
            <View style={{ gap: 8 }}>
              <AppText role="label">Country (optional)</AppText>
              <CountryPicker value={countryCode} onChange={setCountryCode} />
            </View>
          </View>
        </View>
      </View>

      {dirty && <View style={[f.row, { gap: 10, paddingTop: 4 }]}>
        <View style={{ flex: 1 }}>
          <FocusButton label="Cancel" secondary onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <FocusButton label="Save" onPress={commitAndClose} />
        </View>
      </View>}

      <View style={{ gap: 10 }}>
        <View style={[f.row, { justifyContent: "space-between", alignItems: "center" }]}>
          <View style={{ flex: 1 }}>
            <SectionHeader
              title={`Card highlights (${activeIds.length}/${ATHLETE_CARD_HIGHLIGHT_LIMIT})`}
              subtitle="Pick up to 3 stats to feature on Row 1 of your card"
            />
          </View>
          {highlights !== undefined ? (
            <Pressable accessibilityRole="button" onPress={() => saveHighlights(undefined)}>
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


    </View>
  );
}
