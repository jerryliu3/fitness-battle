"use client";

import { useEffect, useState } from "react";
import {
  competeNow,
  competitionCourseWindow,
  formatSpecialEventVolume,
  specialEventCourseUnit,
  specialEventFormatLabel,
  specialEventPhase,
  specialEventSceneLanes,
  specialEventSideCode,
  specialEventSideLabel,
  specialEventStatusBadge,
  specialEventStatusHero,
  type CompeteState,
  type SpecialEventEdition,
  type SpecialEventStandings,
} from "@fitness-battle/shared";
import { useCompete } from "@/components/compete-context";
import { GeographicCourse } from "@/features/course/geographic-course";
import { useCompetitionCourse } from "@/features/course/use-competition-course";
import { AppHeading, AppText } from "@/ui/section";
import { CoursePreview } from "./course-preview";
import { CompeteIcon } from "./event-home";
import { SpecialEventRegistrationSheet } from "./special-event-sheet";

export function SpecialEventFullscreen({
  state,
  edition,
  busy,
  error,
  onCancel,
  onClose,
}: {
  state: CompeteState;
  edition: SpecialEventEdition;
  busy: boolean;
  error: string;
  onCancel(): void;
  onClose(): void;
}) {
  const { debugActive } = useCompete();
  const now = competeNow(state);
  const phase = specialEventPhase(edition, now);
  const status = specialEventStatusBadge(edition, now);
  const courseUnit = specialEventCourseUnit(edition.sport, state.units);
  const supports3D = courseUnit === "mi" || courseUnit === "km";

  const [viewDim, setViewDim] = useState<"3d" | "2d">(supports3D ? "3d" : "2d");
  const [standings, setStandings] = useState<SpecialEventStandings | null>(null);
  const [standingsError, setStandingsError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [focusRequest, setFocusRequest] = useState(0);

  const canViewStandings = Boolean(phase === "active" || phase === "settled" || edition.finalizedAt);
  useEffect(() => {
    setStandings(null);
    setStandingsError("");
    setSelectedId("");
    setViewDim(supports3D ? "3d" : "2d");
    if (!canViewStandings) return;
    let cancelled = false;
    void fetch(`/api/special-events/${encodeURIComponent(edition.id)}`, { cache: "no-store", signal: AbortSignal.timeout(15000) })
      .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setStandingsError(typeof body.error === "string" ? body.error : "Could not load standings."); return; }
        setStandings((body.standings as SpecialEventStandings | null) ?? null);
      })
      .catch(() => { if (!cancelled) setStandingsError("Could not load standings."); });
    return () => { cancelled = true; };
  }, [edition.id, canViewStandings, supports3D]);

  const period = competitionCourseWindow(state, now, edition.sport);
  const { course, error: courseError, retry } = useCompetitionCourse(
    edition.sport, period.startsAt.toISOString(), period.endsAt.toISOString(), debugActive, supports3D && viewDim === "3d",
  );

  const lanes = specialEventSceneLanes(standings, state.units);
  const resolvedSelected = selectedId || lanes.find((l) => l.you)?.id || lanes[0]?.id || "";
  const hero = standings ? specialEventStatusHero(standings, edition, state.units) : null;
  const activeRound = standings?.rounds.find((r) => r.roundNumber === standings.currentRound) ?? standings?.rounds[standings.rounds.length - 1];
  const activeHeat = activeRound?.heats.find((h) => h.isMine) ?? activeRound?.heats[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={edition.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--paper)",
        overflowY: "auto",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "var(--paper)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button type="button" className="fb-btn-line" disabled={busy} onClick={onClose}>
          ← Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <AppHeading role="label">{edition.title}</AppHeading>
          <AppText role="caption" secondary>
            {specialEventFormatLabel(edition.config)} · {status}
          </AppText>
        </div>
        {activeHeat ? (
          <button
            type="button"
            className="fb-btn-line"
            onClick={() => setViewDim((d) => (d === "3d" ? "2d" : "3d"))}
          >
            {viewDim === "3d" ? "2D View" : "3D Map"}
          </button>
        ) : (
          <CompeteIcon name={edition.sport} size={24} />
        )}
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 48px", display: "grid", gap: 16 }}>
        {viewDim === "3d" && supports3D && lanes.length > 0 ? (
          <div style={{ height: 320, borderRadius: 18, overflow: "hidden", border: "1px solid var(--line)", background: "#141923" }}>
            <GeographicCourse
              cardSessionKey={edition.id}
              course={course}
              lanes={lanes}
              unit={courseUnit}
              selectedId={resolvedSelected}
              focusRequest={focusRequest}
              onSelect={(id) => { setSelectedId(id); setFocusRequest((n) => n + 1); }}
              error={courseError}
              onRetry={retry}
            />
          </div>
        ) : viewDim === "2d" && activeHeat ? (
          <section className="fb-card" style={{ padding: 14, display: "grid", gap: 10 }} aria-label="2D proportional standings">
            <AppText role="label">Live course progress · Round {activeRound?.roundNumber}</AppText>
            {(() => {
              const maxScore = Math.max(1, ...activeHeat.sides.map((s) => s.score));
              const showCut = edition.config.match.kind === "survivor_heat" && activeHeat.sides.length > activeHeat.advanceCount;
              return activeHeat.sides.map((side, idx) => (
                <div key={side.sideId} style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <AppText role="caption">
                      {edition.config.grouping.kind !== "solo" ? `${specialEventSideCode(side)} · ` : ""}
                      {specialEventSideLabel(side)}{side.isYou ? " · You" : ""}
                    </AppText>
                    <AppText role="caption">{formatSpecialEventVolume(edition.sport, side.score, state.units)}</AppText>
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: "var(--paper)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(4, Math.round((side.score / maxScore) * 100))}%`, height: "100%", background: side.isYou ? "var(--lime-deep, #7ab800)" : "var(--ink)" }} />
                  </div>
                  {showCut && idx + 1 === activeHeat.advanceCount ? (
                    <div style={{ borderBottom: "2px dashed var(--danger, #b42318)", paddingTop: 4, textAlign: "center" }}>
                      <AppText role="caption" secondary>Elimination cut · Top {activeHeat.advanceCount}</AppText>
                    </div>
                  ) : null}
                </div>
              ));
            })()}
          </section>
        ) : (
          <CoursePreview sport={edition.sport} queued={phase !== "active"} state={state} />
        )}

        {hero ? (
          <section
            style={{
              padding: 14,
              borderRadius: 18,
              background: "var(--ink, #12141a)",
              color: "#fff",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span
                style={{
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: hero.tone === "lime" ? "var(--lime, #b7f255)" : hero.tone === "danger" ? "rgba(180,35,24,0.28)" : "rgba(212,160,23,0.22)",
                  color: hero.tone === "lime" ? "#12141a" : "#fff",
                }}
              >
                <AppText role="caption">{hero.badge}</AppText>
              </span>
              <AppText role="caption">{status}</AppText>
            </div>
            <AppHeading role="heading">{hero.headline}</AppHeading>
            <AppText role="caption">{hero.detail}</AppText>
          </section>
        ) : null}

        <SpecialEventRegistrationSheet
          state={state}
          edition={edition}
          busy={busy}
          error={error}
          fullscreen
          standingsOverride={canViewStandings ? standings : undefined}
          standingsErrorOverride={canViewStandings ? standingsError : undefined}
          onRegister={() => {}}
          onCancel={onCancel}
          onClose={onClose}
        />
      </main>
    </div>
  );
}
