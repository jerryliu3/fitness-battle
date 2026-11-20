import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import {
  competeNow,
  countryFlagEmoji,
  countryName,
  entryBarcode,
  extractCrewOptions,
  formatSpecialEventVolume,
  specialEventRegistrationDetail,
  specialEventRoundLabel,
  specialEventSideLabel,
  specialEventStatusBadge,
  type CompeteState,
  type SpecialEventEdition,
  type SpecialEventStandings,
} from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { FocusButton, useFocusStyles } from "../ui/focus";
import { CountryPicker } from "../ui/country-picker";
import { WaveCountdown } from "../ui/wave-countdown";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useCachedApi } from "../lib/use-cached-api";
import { CompeteIcon, EventArt } from "./compete-home-sections";
import { SpecialEventRelayPanel } from "./special-event-relay-panel";

export function SpecialEventRegistrationSheet({
  state,
  edition,
  busy,
  error,
  onRegister,
  onCancel,
  onClose,
}: {
  state: CompeteState;
  edition: SpecialEventEdition;
  busy: boolean;
  error?: string;
  onRegister(options: { crewId?: string | null; groupValue?: string | null }): void;
  onCancel(): void;
  onClose(): void;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const { blocks } = useAthleteBlocks();
  const now = competeNow(state);
  const detail = specialEventRegistrationDetail(state, edition, now);
  const [expandedRule, setExpandedRule] = useState<Record<string, boolean>>({});
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [showAllHeats, setShowAllHeats] = useState(false);
  const canViewStandings = Boolean(edition.entry && (detail.phase === "active" || detail.phase === "settled" || edition.finalizedAt));
  const standingsApi = useCachedApi<{ standings: SpecialEventStandings }>(
    canViewStandings ? `/api/special-events/${encodeURIComponent(edition.id)}` : null,
  );
  const standings = standingsApi.data?.standings ?? null;
  const [countryCode, setCountryCode] = useState(
    edition.entry?.groupSnapshot?.country_code ?? state.countryCode ?? "",
  );
  const [crewId, setCrewId] = useState(edition.entry?.requestedCrewId ?? "");
  const crewsApi = useCachedApi<{ crews: unknown }>(detail.requiresCrew ? "/api/crews" : null);
  const crews = extractCrewOptions(crewsApi.data?.crews);

  useEffect(() => {
    setCountryCode(edition.entry?.groupSnapshot?.country_code ?? state.countryCode ?? "");
    setCrewId(edition.entry?.requestedCrewId ?? "");
    setSelectedRound(null);
    setShowAllHeats(false);
  }, [edition.id, edition.entry?.requestedCrewId, edition.entry?.groupSnapshot?.country_code, state.countryCode]);

  const firstCrewId = crews[0]?.id ?? "";
  useEffect(() => {
    if (detail.requiresCrew && !crewId && firstCrewId) setCrewId(firstCrewId);
  }, [detail.requiresCrew, crewId, firstCrewId]);

  const barcode = entryBarcode(`special:${edition.id}:${edition.startsAt}`);
  const statusLabel = specialEventStatusBadge(edition, now);
  const isRegistered = edition.entry?.status === "registered";
  const canSubmit =
    detail.canRegister &&
    (!detail.requiresCountry || countryCode.length === 2) &&
    (!detail.requiresCrew || Boolean(crewId));

  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          padding: 18,
          borderRadius: 20,
          backgroundColor: c.actionSoft,
          borderWidth: 1,
          borderColor: c.line,
          overflow: "hidden",
          gap: 8,
        }}
      >
        <EventArt event={edition.sport} feature gold />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CompeteIcon name={edition.sport} size={24} gold />
          <AppText role="caption" secondary>{detail.tag} · {detail.dateRange}</AppText>
        </View>
        <AppText role="display">{detail.title}</AppText>
        <AppText role="body" secondary>{detail.subtitle}</AppText>
        <View style={{ paddingTop: 4, gap: 4 }}>
          <AppText role="caption" secondary>
            {detail.phase === "registering"
              ? `${edition.entrantCount} athlete${edition.entrantCount === 1 ? "" : "s"} registered · Closes ${detail.cutoffLabel}`
              : `${statusLabel} · Full-week entries are locked`}
          </AppText>
          {detail.phase === "registering" ? (
            <AppText role="label">
              Starts in <WaveCountdown start={edition.startsAt} now={now} inline />
            </AppText>
          ) : null}
        </View>
      </View>

      {edition.config.scoring.mode === "relay_handoff" && (edition.entry?.requestedCrewId || crewId) ? (
        <SpecialEventRelayPanel edition={edition} crewId={edition.entry?.requestedCrewId || crewId} units={state.units} />
      ) : null}

      {canViewStandings ? (
        <View style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 10 }}>
          {standingsApi.error ? (
            <AppText role="caption">{standingsApi.error}</AppText>
          ) : !standings ? (
            <AppText role="caption" secondary>Loading live standings…</AppText>
          ) : standings.rounds.length === 0 ? (
            <AppText role="caption" secondary>Finalizing heat assignments…</AppText>
          ) : (() => {
            const totalRounds = standings.rounds.length;
            const round = standings.rounds.find((r) => r.roundNumber === (selectedRound ?? standings.currentRound)) ?? standings.rounds[totalRounds - 1]!;
            const heats = showAllHeats || !round.heats.some((h) => h.isMine) ? round.heats : round.heats.filter((h) => h.isMine);
            const showCutLine = edition.config.match.kind !== "single_round";
            return (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {standings.rounds.map((r) => {
                      const active = r.roundNumber === round.roundNumber;
                      return (
                        <Pressable
                          key={r.roundNumber}
                          accessibilityRole="button"
                          onPress={() => setSelectedRound(r.roundNumber)}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: active ? c.podiumGold : c.line, backgroundColor: active ? c.actionSoft : c.paper }}
                        >
                          <AppText role="caption">{specialEventRoundLabel(edition.config, r.roundNumber, totalRounds)}</AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {round.heats.length > 1 ? (
                    <Pressable accessibilityRole="button" onPress={() => setShowAllHeats((v) => !v)}>
                      <AppText role="caption" secondary>{showAllHeats ? "My matchup" : `All (${round.heats.length})`}</AppText>
                    </Pressable>
                  ) : null}
                </View>
                {heats.map((heat) => (
                  <View key={heat.id} style={{ gap: 4 }}>
                    {round.heats.length > 1 ? <AppText role="caption" secondary>{`Matchup ${heat.heatIndex}`}</AppText> : null}
                    {heat.sides.map((side, idx) => {
                      const blocked = Boolean(side.userId && blocks.some((b) => b.id === side.userId));
                      return (
                        <View key={side.sideId}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: c.line }}>
                            <AppText role="caption" secondary>{side.place}</AppText>
                            <AppText role="label" style={{ flex: 1 }}>
                              {blocked ? "Athlete" : specialEventSideLabel(side)}{side.isYou ? " · You" : ""}
                            </AppText>
                            <AppText role="caption">{formatSpecialEventVolume(edition.sport, side.score, state.units)}</AppText>
                          </View>
                          {showCutLine && heat.sides.length > heat.advanceCount && idx + 1 === heat.advanceCount ? (
                            <View style={{ paddingVertical: 4, borderBottomWidth: 1, borderStyle: "dashed", borderColor: c.podiumGold, alignItems: "center" }}>
                              <AppText role="caption" secondary>Advancement cut · Top {heat.advanceCount}</AppText>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ))}
                {standings.myStatus === "spectating" ? (
                  <AppText role="caption" secondary>Watching live — equal-size squads were matched for this heat.</AppText>
                ) : null}
                {standings.mySquad && standings.mySquad.length > 0 ? (
                  <View style={{ gap: 4, paddingTop: 6 }}>
                    <AppText role="label">Your squad</AppText>
                    {standings.mySquad.map((m) => {
                      const memberBlocked = blocks.some((b) => b.id === m.userId);
                      return (
                        <View key={m.userId} style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderColor: c.line }}>
                          <AppText role="caption">{memberBlocked ? "Athlete" : m.displayName}{m.isYou ? " · You" : ""}</AppText>
                          <AppText role="caption">{formatSpecialEventVolume(edition.sport, m.score, state.units)}</AppText>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })()}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <AppText role="label">How this event works</AppText>
        {detail.ruleCards.map((card) => {
          const open = Boolean(expandedRule[card.id]);
          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setExpandedRule((prev) => ({ ...prev, [card.id]: !prev[card.id] }))}
              style={{
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: open ? c.podiumGold : c.line,
                backgroundColor: c.card,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <CompeteIcon name={card.icon} size={18} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText role="label">{card.title}</AppText>
                  <AppText role="caption" secondary>{card.summary}</AppText>
                </View>
                <CompeteIcon name="replay" size={14} color={c.muted} />
              </View>
              {open ? <AppText role="caption" secondary>{card.detail}</AppText> : null}
            </Pressable>
          );
        })}
      </View>

      {detail.canRegister && detail.requiresCountry ? (
        <View style={{ gap: 6 }}>
          <AppText role="label">Your country team</AppText>
          <CountryPicker value={countryCode} onChange={setCountryCode} />
          <AppText role="caption" secondary>
            Locked when registration closes. Pooled with teammates from {countryCode ? `${countryFlagEmoji(countryCode)} ${countryName(countryCode) ?? countryCode}` : "your country"}.
          </AppText>
        </View>
      ) : null}

      {detail.canRegister && detail.requiresCrew ? (
        <View style={{ gap: 8 }}>
          <AppText role="label">Choose your crew</AppText>
          {crews.length ? (
            <View style={{ gap: 8 }}>
              {crews.map((crew) => (
                <Pressable
                  key={crew.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: crew.id === crewId }}
                  onPress={() => setCrewId(crew.id)}
                  style={[
                    f.chip,
                    { borderColor: crew.id === crewId ? c.podiumGold : c.line, backgroundColor: crew.id === crewId ? c.actionSoft : c.card },
                  ]}
                >
                  <AppText role="label">{crew.name}</AppText>
                </Pressable>
              ))}
            </View>
          ) : (
            <AppText role="caption" secondary>
              {crewsApi.busy ? "Loading crews…" : "Join or create a crew in the Crew tab first."}
            </AppText>
          )}
        </View>
      ) : null}

      <View style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 8 }}>
        {detail.ticketRows.map((row) => (
          <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <AppText role="caption" secondary>{row.label}</AppText>
            <AppText role="caption">{row.value}</AppText>
          </View>
        ))}
        <View style={{ paddingTop: 8, borderTopWidth: 1, borderColor: c.line, gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText role="caption" secondary>SPECIAL EVENT PASS</AppText>
            <AppText role="caption" secondary>{statusLabel.toUpperCase()}</AppText>
          </View>
          <View accessible={false} style={{ flexDirection: "row", height: 22, gap: 1, alignItems: "stretch" }}>
            {barcode.slice(0, 42).map((w, i) => (
              <View key={i} style={{ flex: w, backgroundColor: i % 2 === 0 ? c.ink : "transparent", opacity: 0.7 }} />
            ))}
          </View>
        </View>
      </View>

      {error ? <AppText role="caption" accessibilityRole="alert">{error}</AppText> : null}

      <View style={{ gap: 8 }}>
        {detail.canRegister ? (
          <FocusButton
            label={busy ? "Registering…" : "Claim full-week entry"}
            disabled={busy || !canSubmit}
            onPress={() => onRegister({
              crewId: detail.requiresCrew ? crewId : null,
              groupValue: detail.requiresCountry ? countryCode : null,
            })}
          />
        ) : null}
        {isRegistered && detail.canCancel ? (
          <FocusButton
            label={busy ? "Cancelling…" : "Cancel registration"}
            secondary
            disabled={busy}
            onPress={onCancel}
          />
        ) : null}
        {!detail.canRegister ? <FocusButton label="Done" onPress={onClose} /> : null}
      </View>
    </View>
  );
}
