"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  COMPETE_ART_COLORS,
  cityLabel,
  competeNow,
  countryFlagEmoji,
  countryName,
  entryBarcode,
  extractCrewOptions,
  filterCities,
  formatSpecialEventVolume,
  inferCitySlug,
  specialEventRegistrationDetail,
  specialEventRoundLabel,
  specialEventSideCode,
  specialEventSideLabel,
  specialEventStatusBadge,
  type CompeteState,
  type SpecialEventEdition,
  type SpecialEventStandings,
} from "@fitness-battle/shared";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { CountryCombobox } from "@/ui/country-combobox";
import { WaveCountdown } from "@/ui/wave-countdown";
import { CompeteIcon, EventArt } from "./event-home";
import { SpecialEventRelayPanel } from "./special-event-relay-panel";

export function SpecialEventRegistrationSheet({
  state,
  edition,
  busy,
  error,
  fullscreen = false,
  standingsOverride,
  standingsErrorOverride,
  onRegister,
  onCancel,
  onClose,
}: {
  state: CompeteState;
  edition: SpecialEventEdition;
  busy: boolean;
  error: string;
  fullscreen?: boolean;
  standingsOverride?: SpecialEventStandings | null;
  standingsErrorOverride?: string;
  onRegister(options: { crewId?: string | null; groupValue?: string | null }): void;
  onCancel(): void;
  onClose(): void;
}) {
  const now = competeNow(state);
  const detail = specialEventRegistrationDetail(state, edition, now);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [countryCode, setCountryCode] = useState(
    edition.entry?.groupSnapshot?.country_code ?? state.countryCode ?? "",
  );
  const [citySlug, setCitySlug] = useState(
    edition.entry?.groupSnapshot?.city_slug ?? inferCitySlug(state.city, state.countryCode),
  );
  const [cityQuery, setCityQuery] = useState("");
  const [crews, setCrews] = useState<{ id: string; name: string }[]>([]);
  const [crewId, setCrewId] = useState(edition.entry?.requestedCrewId ?? "");
  const [crewsLoaded, setCrewsLoaded] = useState(false);
  const [fetchedStandings, setFetchedStandings] = useState<SpecialEventStandings | null>(null);
  const [fetchedError, setFetchedError] = useState("");
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [showAllHeats, setShowAllHeats] = useState(false);
  const [squadOpen, setSquadOpen] = useState(true);
  const canViewStandings = Boolean((edition.entry || fullscreen) && (detail.phase === "active" || detail.phase === "settled" || edition.finalizedAt));
  const managedStandings = standingsOverride !== undefined;
  const standings = managedStandings ? standingsOverride : fetchedStandings;
  const standingsError = standingsErrorOverride ?? fetchedError;

  useEffect(() => {
    setCountryCode(edition.entry?.groupSnapshot?.country_code ?? state.countryCode ?? "");
    setCitySlug(edition.entry?.groupSnapshot?.city_slug ?? inferCitySlug(state.city, state.countryCode));
    setCityQuery("");
    setCrewId(edition.entry?.requestedCrewId ?? "");
    setFetchedStandings(null);
    setFetchedError("");
    setSelectedRound(null);
    setShowAllHeats(false);
  }, [edition.id, edition.entry?.requestedCrewId, edition.entry?.groupSnapshot?.country_code, edition.entry?.groupSnapshot?.city_slug, state.countryCode, state.city]);

  useEffect(() => {
    if (!canViewStandings || managedStandings) return;
    let cancelled = false;
    void fetch(`/api/special-events/${encodeURIComponent(edition.id)}`, { cache: "no-store", signal: AbortSignal.timeout(15000) })
      .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setFetchedError(typeof body.error === "string" ? body.error : "Could not load standings."); return; }
        const next = body.standings as SpecialEventStandings | null;
        setFetchedStandings(next);
        if (next) setSelectedRound((prev) => prev ?? next.currentRound);
      })
      .catch(() => { if (!cancelled) setFetchedError("Could not load standings."); });
    return () => { cancelled = true; };
  }, [canViewStandings, managedStandings, edition.id]);

  useEffect(() => {
    if (!detail.requiresCrew) return;
    let cancelled = false;
    setCrewsLoaded(false);
    void fetch("/api/crews", { cache: "no-store", signal: AbortSignal.timeout(15000) })
      .then((res) => (res.ok ? res.json() : { crews: [] }))
      .then((data) => {
        if (cancelled) return;
        const mapped = extractCrewOptions(data.crews);
        setCrews(mapped);
        if (mapped[0]) setCrewId((prev) => prev || mapped[0]!.id);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCrewsLoaded(true); });
    return () => { cancelled = true; };
  }, [detail.requiresCrew, edition.id]);

  const barcode = entryBarcode(`special:${edition.id}:${edition.startsAt}`);
  const statusLabel = specialEventStatusBadge(edition, now);
  const isRegistered = edition.entry?.status === "registered";
  const canSubmit =
    detail.canRegister &&
    (!detail.requiresCountry || countryCode.length === 2) &&
    (!detail.requiresCity || Boolean(citySlug)) &&
    (!detail.requiresCrew || Boolean(crewId));

  return (
    <div
      className="event-registration"
      style={{ "--registration-color": COMPETE_ART_COLORS[edition.sport], display: "grid", gap: 16 } as CSSProperties}
    >
      <div className="registration-hero">
        <EventArt event={edition.sport} gold />
        <div className="registration-hero-meta">
          <AppHeading role="display">{detail.title}</AppHeading>
          <AppText role="caption" secondary>{detail.tag} · {detail.dateRange}</AppText>
        </div>
        <AppParagraph typographyRole="support" className="ui-text-secondary">{detail.subtitle}</AppParagraph>
        <div className="registration-field-box">
          <AppText role="caption" secondary>
            {detail.phase === "registering"
              ? `${edition.entrantCount} athlete${edition.entrantCount === 1 ? "" : "s"} registered · Closes ${detail.cutoffLabel}`
              : detail.phase === "active"
                ? `${statusLabel} · Full-week entries are locked`
                : statusLabel}
          </AppText>
          {detail.phase === "registering" ? (
            <AppText role="label">
              Starts in <WaveCountdown start={edition.startsAt} now={now} />
            </AppText>
          ) : null}
        </div>
      </div>

      {edition.config.scoring.mode === "relay_handoff" && (edition.entry?.requestedCrewId || crewId) ? (
        <SpecialEventRelayPanel edition={edition} crewId={edition.entry?.requestedCrewId || crewId} units={state.units} />
      ) : null}

      {canViewStandings ? (
        <section className="fb-card" style={{ padding: 14, display: "grid", gap: 12 }} aria-label="Special event standings">
          {standingsError ? <AppText role="caption">{standingsError}</AppText> : !standings ? (
            <AppText role="caption" secondary>Loading live standings…</AppText>
          ) : standings.rounds.length === 0 ? (
            <AppText role="caption" secondary>Finalizing heat assignments…</AppText>
          ) : (() => {
            const totalRounds = standings.rounds.length;
            const round = standings.rounds.find((r) => r.roundNumber === selectedRound) ?? standings.rounds[totalRounds - 1]!;
            const heats = showAllHeats || !round.heats.some((h) => h.isMine) ? round.heats : round.heats.filter((h) => h.isMine);
            const showCutLine = edition.config.match.kind !== "single_round";
            return (
              <>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {standings.rounds.map((r) => (
                      <button
                        key={r.roundNumber}
                        type="button"
                        className={r.roundNumber === round.roundNumber ? "fb-btn" : "fb-btn-line"}
                        onClick={() => setSelectedRound(r.roundNumber)}
                      >
                        {specialEventRoundLabel(edition.config, r.roundNumber, totalRounds)}
                      </button>
                    ))}
                  </div>
                  {round.heats.length > 1 ? (
                    <button type="button" className="fb-btn-line" onClick={() => setShowAllHeats((v) => !v)}>
                      {showAllHeats ? "My matchup" : `All (${round.heats.length})`}
                    </button>
                  ) : null}
                </div>
                {heats.map((heat) => (
                  <div key={heat.id} style={{ display: "grid", gap: 6 }}>
                    {round.heats.length > 1 ? <AppText role="caption" secondary>{`Matchup ${heat.heatIndex}`}</AppText> : null}
                    {heat.sides.map((side, idx) => (
                      <div key={side.sideId}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line)", opacity: showCutLine && idx + 1 > heat.advanceCount && round.settledAt ? 0.55 : 1 }}>
                          <AppText role="caption" secondary>{side.place}</AppText>
                          {edition.config.grouping.kind !== "solo" ? (
                            <span style={{ padding: "2px 6px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--accent-soft, #e8edf5)" }}>
                              <AppText role="caption">{specialEventSideCode(side)}</AppText>
                            </span>
                          ) : null}
                          <AppText role="label" style={{ flex: 1 }}>
                            {specialEventSideLabel(side)}{side.isYou ? " · You" : ""}
                          </AppText>
                          <AppText role="caption">{formatSpecialEventVolume(edition.sport, side.score, state.units)}</AppText>
                        </div>
                        {showCutLine && heat.sides.length > heat.advanceCount && idx + 1 === heat.advanceCount ? (
                          <div style={{ padding: "5px 0", borderBottom: "2px dashed var(--danger, #b42318)", textAlign: "center" }}>
                            <AppText role="caption" secondary>Elimination cut · Top {heat.advanceCount} advance</AppText>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
                {standings.myStatus === "spectating" || standings.myStatus === "eliminated" ? (
                  <AppText role="caption" secondary>
                    {standings.myStatus === "eliminated"
                      ? "Eliminated — staying in the stadium as your heat finishes."
                      : "Watching live — equal-size squads were matched for this heat."}
                  </AppText>
                ) : null}
                {standings.mySquad && standings.mySquad.length > 0 ? (() => {
                  const squadTotal = Math.max(1, standings.mySquad.reduce((sum, m) => sum + m.score, 0));
                  return (
                    <div style={{ display: "grid", gap: 8, paddingTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => setSquadOpen((v) => !v)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
                      >
                        <AppText role="label">Your squad ({standings.mySquad.length})</AppText>
                        <AppText role="caption" secondary>{squadOpen ? "Hide" : "Show"}</AppText>
                      </button>
                      {squadOpen ? standings.mySquad.map((m) => {
                        const pct = Math.round((m.score / squadTotal) * 100);
                        return (
                          <div key={m.userId} style={{ display: "grid", gap: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <AppText role="caption">{m.displayName}{m.isYou ? " · You" : ""}</AppText>
                              <AppText role="caption">{formatSpecialEventVolume(edition.sport, m.score, state.units)} ({pct}%)</AppText>
                            </div>
                            <div style={{ height: 6, borderRadius: 99, background: "var(--paper)", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: m.isYou ? "var(--lime-deep, #7ab800)" : "var(--ink)" }} />
                            </div>
                          </div>
                        );
                      }) : null}
                    </div>
                  );
                })() : null}
              </>
            );
          })()}
        </section>
      ) : null}

      <div className="registration-rules">
        <div className="registration-rules-head">
          <AppText role="label">How this event works</AppText>
          <AppText role="caption" secondary>Tap a card to learn more</AppText>
        </div>
        <div className="registration-rule-grid">
          {detail.ruleCards.map((item, i) => {
            const isFlipped = Boolean(flipped[i]);
            return (
              <button
                key={item.id}
                type="button"
                className="registration-rule-card"
                data-flipped={isFlipped}
                aria-pressed={isFlipped}
                aria-label={`${item.title}, ${item.summary}. ${isFlipped ? item.detail : "Tap to see details."}`}
                onClick={() => setFlipped((prev) => ({ ...prev, [i]: !prev[i] }))}
              >
                <span className="registration-rule-inner">
                  <span className="registration-rule-face registration-rule-front" aria-hidden={isFlipped}>
                    <span className="registration-rule-flip" aria-hidden="true"><CompeteIcon name="replay" size={14} /></span>
                    <span className="registration-detail-icon"><CompeteIcon name={item.icon} size={20} /></span>
                    <span className="registration-rule-copy">
                      <AppText role="label">{item.title}</AppText>
                      <AppText role="caption" secondary>{item.summary}</AppText>
                    </span>
                  </span>
                  <span className="registration-rule-face registration-rule-back" aria-hidden={!isFlipped}>
                    <span className="registration-rule-back-head">
                      <span className="registration-rule-back-title"><AppText role="label">{item.title}</AppText></span>
                      <span className="registration-rule-flip" aria-hidden="true"><CompeteIcon name="replay" size={14} /></span>
                    </span>
                    <AppText role="caption" secondary>{item.detail}</AppText>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {detail.canRegister && detail.requiresCountry ? (
        <div style={{ display: "grid", gap: 6 }}>
          <CountryCombobox label="Your country team" value={countryCode} onChange={setCountryCode} />
          <AppText role="caption" secondary>
            Locked when registration closes. You’ll be pooled into an equal-size squad from {countryCode ? `${countryFlagEmoji(countryCode)} ${countryName(countryCode) ?? countryCode}` : "your country"}.
          </AppText>
        </div>
      ) : null}

      {detail.canRegister && detail.requiresCity ? (
        <div style={{ display: "grid", gap: 8 }}>
          <label className="fb-copy">
            Your city team
            <input
              className="fb-input"
              placeholder="Search city (e.g. New York, London, Tokyo)"
              value={cityQuery}
              disabled={busy}
              onChange={(e) => setCityQuery(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {filterCities(cityQuery, citySlug).slice(0, 8).map((city) => (
              <button
                key={city.slug}
                type="button"
                className={city.slug === citySlug ? "fb-btn" : "fb-btn-line"}
                disabled={busy}
                onClick={() => setCitySlug(city.slug)}
              >
                {cityLabel(city.slug)}
              </button>
            ))}
          </div>
          <AppText role="caption" secondary>
            Locked when registration closes. Pooled with teammates from {citySlug ? cityLabel(citySlug) : "your city"}.
          </AppText>
        </div>
      ) : null}

      {detail.canRegister && detail.requiresCrew ? (
        <div style={{ display: "grid", gap: 6 }}>
          <label className="fb-copy">
            Choose your crew
            <select
              className="fb-input"
              disabled={busy || !crewsLoaded || !crews.length}
              value={crewId}
              onChange={(e) => setCrewId(e.target.value)}
            >
              {crews.length ? crews.map((crew) => (
                <option key={crew.id} value={crew.id}>{crew.name}</option>
              )) : (
                <option value="">{crewsLoaded ? "Join or create a crew first" : "Loading crews…"}</option>
              )}
            </select>
          </label>
          <AppText role="caption" secondary>Each teammate opts in individually before Monday 6:00 AM ET.</AppText>
        </div>
      ) : null}

      <div className="fb-card" style={{ padding: 14, display: "grid", gap: 8 }}>
        {detail.ticketRows.map((row) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <AppText role="caption" secondary>{row.label}</AppText>
            <AppText role="caption">{row.value}</AppText>
          </div>
        ))}
        <div className="registration-ticket-stub" style={{ marginTop: 6 }}>
          <div className="registration-stub-meta">
            <AppText role="caption" secondary>SPECIAL EVENT PASS</AppText>
            <AppText role="caption" secondary>{statusLabel.toUpperCase()}</AppText>
          </div>
          <span className="registration-barcode" aria-hidden="true">
            {barcode.map((width, i) => <i key={i} style={{ flexGrow: width }} />)}
          </span>
        </div>
      </div>

      {error ? <AppParagraph typographyRole="caption" role="alert">{error}</AppParagraph> : null}

      <div style={{ display: "grid", gap: 8 }}>
        {detail.canRegister ? (
          <button
            type="button"
            className="fb-btn"
            disabled={busy || !canSubmit}
            onClick={() => onRegister({
              crewId: detail.requiresCrew ? crewId : null,
              groupValue: detail.requiresCountry ? countryCode : detail.requiresCity ? citySlug : null,
            })}
          >
            {busy ? "Registering…" : "Claim full-week entry"}
          </button>
        ) : null}

        {isRegistered && detail.canCancel ? (
          <button type="button" className="fb-btn-line" disabled={busy} onClick={onCancel}>
            {busy ? "Cancelling…" : "Cancel registration"}
          </button>
        ) : null}

        {!fullscreen && !detail.canRegister ? (
          <button type="button" className="fb-btn" onClick={onClose}>Done</button>
        ) : null}
      </div>
    </div>
  );
}
