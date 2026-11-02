"use client";
import Link from "next/link";
import { useState } from "react";
import {
  competeNow,
  effortScoreLine,
  seasonPassModel,
  type CompeteState,
  type OpenLineRange,
  type ScoreTrack,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { CompetitionReplayButton } from "@/features/replay/competition-replay";
import { useScoreTrackLens } from "@/lib/score-track-lens";
import { OpenLineChart } from "@/ui/open-line-chart";
import { AppHeading, AppParagraph, AppText, typographyStyle } from "@/ui/section";

export function EffortTrend({
  state,
}: {
  state: CompeteState;
  email?: string | null;
}) {
  const { user } = useAuth();
  const [defaultTrack] = useScoreTrackLens();
  const scope = `${user?.id}:${state.primary}`;
  const [lens, setLens] = useState<{ scope: string; track: ScoreTrack } | null>(
    null,
  );
  const [range, setRange] = useState<OpenLineRange>("fourWeeks");
  const track = lens?.scope === scope ? lens.track : defaultTrack;
  const now = competeNow(state);
  const chart = effortScoreLine(state, track, range);
  const pass = seasonPassModel(state, track, now);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const activeWeek =
    pass.weekNodes.find((w) => w.id === selectedWeekId) ??
    pass.weekNodes[0] ??
    null;

  return (
    <section
      id="effort-score"
      className="effort-open-chart"
      style={{ display: "grid", gap: 16 }}
    >
      {/* HERO SEASON LADDER CARD */}
      <div
        style={{
          background: "linear-gradient(155deg, #142b3b 0%, #0d1f2d 100%)",
          border: "1px solid #243c4e",
          borderRadius: 22,
          padding: 18,
          color: "#ffffff",
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <span
              style={{
                ...typographyStyle("caption"),
                color: "#f7c948",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Season Ladder · {pass.sportName}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <strong style={{ ...typographyStyle("display"), color: "#ffffff" }}>
                {pass.score.toLocaleString()}
              </strong>
              <span style={{ ...typographyStyle("label"), color: "#c9d6e3" }}>
                {pass.band.name}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right", display: "grid", gap: 2 }}>
            <span style={{ ...typographyStyle("caption"), color: "#c9d6e3" }}>
              {pass.nextBand
                ? `Next Tier: ${pass.nextBand.name}`
                : "Top Rank Band"}
            </span>
            <strong style={{ ...typographyStyle("caption"), color: "#f7c948" }}>
              {pass.nextBand
                ? `${pass.intoNext} pts to ${pass.nextBand.min.toLocaleString()}`
                : "Champion (2,000+)"}
            </strong>
          </div>
        </div>

        {/* 5-Checkpoint Visual Rank Ladder Track */}
        <div style={{ display: "grid", gap: 6, paddingTop: 2 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 4,
            }}
          >
            {pass.checkpoints.map((cp) => (
              <span
                key={cp.min}
                style={{
                  ...typographyStyle("caption"),
                  color: cp.current
                    ? "#f7c948"
                    : cp.reached
                      ? "#ffffff"
                      : "#8fa2b5",
                  fontWeight: cp.current ? 800 : 500,
                }}
              >
                {cp.min.toLocaleString()}
                {cp.current ? " ★" : ""}
              </span>
            ))}
          </div>
          <div
            style={{
              position: "relative",
              height: 10,
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.14)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: `${Math.round(pass.ladderProgress * 100)}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #176c75 0%, #f7c948 100%)",
              }}
            />
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "#f7c948",
                border: "2px solid #142b3b",
                marginLeft: -7,
                boxShadow: "0 0 0 2px rgba(247, 201, 72, 0.35)",
              }}
            />
          </div>
          <span style={{ ...typographyStyle("caption"), color: "#c9d6e3" }}>
            {pass.band.blurb}
          </span>
        </div>
      </div>

      {/* EFFORT SCORE CHART + OPEN/GPS LENS */}
      <div
        className="fb-card"
        style={{
          background: "#ffffff",
          border: "1px solid #e3e9e7",
          borderRadius: 20,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div
          className="focus-elo-track-toggle"
          role="group"
          aria-label="Effort chart score track"
        >
          {(["open", "verified"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={track === value}
              onClick={() => setLens({ scope, track: value })}
            >
              {value === "open" ? "Open" : "GPS Tracked"}
            </button>
          ))}
        </div>
        <OpenLineChart
          showAxes={false}
          live
          key={`${scope}:${track}`}
          chart={chart}
          label={`${track === "open" ? "Open" : "GPS Tracked"} effort score history`}
          unit="Effort score"
          range={range}
          onRangeChange={setRange}
        />
      </div>

      {/* UNIFIED PAST WEEKS & AWARDS SCRUBBER */}
      <div
        className="club-history-preview-section"
        style={{
          background: "#ffffff",
          border: "1px solid #e3e9e7",
          borderRadius: 20,
          padding: 16,
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <AppHeading level={3} role="heading" style={{ margin: 0 }}>
              Past weeks &amp; awards
            </AppHeading>
            <AppText role="caption" secondary>
              {pass.settledWeeksCount > 0
                ? `${pass.settledWeeksCount} settled ${pass.settledWeeksCount === 1 ? "week" : "weeks"} · ${pass.podiumsCount} ${pass.podiumsCount === 1 ? "podium" : "podiums"} · Tap a week node to inspect`
                : "Settled rounds and weekly score changes land here"}
            </AppText>
          </div>
          <Link
            href="/you/history"
            aria-label="View all past weeks and awards"
            style={{
              ...typographyStyle("label"),
              color: "#176c75",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            View all →
          </Link>
        </div>

        {pass.weekNodes.length > 0 && activeWeek ? (
          <>
            {/* Interactive Week Node Pills */}
            <div
              role="group"
              aria-label="Recent settled weeks"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(5, pass.weekNodes.length)}, minmax(0, 1fr))`,
                gap: 6,
              }}
            >
              {pass.weekNodes.map((wk) => {
                const isSelected = wk.id === activeWeek.id;
                return (
                  <button
                    key={wk.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedWeekId(wk.id)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 14,
                      border: `1px solid ${isSelected ? "#142b3b" : "#e3e9e7"}`,
                      background: isSelected ? "#142b3b" : "#f8f9f6",
                      color: isSelected ? "#ffffff" : "#142b3b",
                      cursor: "pointer",
                      display: "grid",
                      gap: 2,
                      textAlign: "center",
                    }}
                  >
                    <strong
                      style={{
                        ...typographyStyle("caption"),
                        color: isSelected ? "#f7c948" : "#176c75",
                        fontWeight: 800,
                      }}
                    >
                      #{wk.place}
                    </strong>
                    <span
                      style={{
                        ...typographyStyle("caption"),
                        fontWeight: 700,
                        color: isSelected ? "#ffffff" : "#142b3b",
                      }}
                    >
                      {wk.deltaLabel}
                    </span>
                    <span
                      style={{
                        ...typographyStyle("caption"),
                        color: isSelected ? "#c9d6e3" : "#637482",
                      }}
                    >
                      {wk.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Week Dimensional Award & Replay Receipt */}
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                background: "#fffdf5",
                border: "1px solid #f7c948",
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 10,
                      background: "#142b3b",
                      color: "#f7c948",
                      ...typographyStyle("label"),
                    }}
                  >
                    #{activeWeek.place} of {activeWeek.fieldSize}
                  </span>
                  <div style={{ display: "grid", gap: 1 }}>
                    <strong style={{ ...typographyStyle("label"), color: "#142b3b" }}>
                      {activeWeek.headline}
                    </strong>
                    <span style={{ ...typographyStyle("caption"), color: "#637482" }}>
                      {activeWeek.rangeLabel} · {activeWeek.sportName} (
                      {activeWeek.trackLabel})
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong
                    style={{
                      ...typographyStyle("heading"),
                      color: "#176c75",
                      display: "block",
                    }}
                  >
                    {activeWeek.deltaLabel} pts
                  </strong>
                  <span style={{ ...typographyStyle("caption"), color: "#637482" }}>
                    {activeWeek.eloBefore} → {activeWeek.eloAfter}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(247, 201, 72, 0.45)",
                  textAlign: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      ...typographyStyle("caption"),
                      color: "#637482",
                      display: "block",
                    }}
                  >
                    Volume
                  </span>
                  <strong style={{ ...typographyStyle("label"), color: "#142b3b" }}>
                    {activeWeek.volumeLabel}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      ...typographyStyle("caption"),
                      color: "#637482",
                      display: "block",
                    }}
                  >
                    Week Effort
                  </span>
                  <strong style={{ ...typographyStyle("label"), color: "#142b3b" }}>
                    {activeWeek.effortLabel} pts
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      ...typographyStyle("caption"),
                      color: "#637482",
                      display: "block",
                    }}
                  >
                    Standing
                  </span>
                  <strong style={{ ...typographyStyle("label"), color: "#142b3b" }}>
                    {activeWeek.frozen
                      ? "Frozen"
                      : activeWeek.place === 1
                        ? "1st Place"
                        : activeWeek.place <= 3
                          ? "Podium"
                          : `Place #${activeWeek.place}`}
                  </strong>
                </div>
              </div>

              <CompetitionReplayButton
                state={state}
                selection={activeWeek.result}
                label={`Replay round · ${activeWeek.rangeLabel}`}
              />
            </div>
          </>
        ) : (
          <AppParagraph typographyRole="body" className="fb-copy">
            When your first competition week settles Monday 00:00 ET, your
            placement award card, score delta, and 3D round replay will appear
            here.
          </AppParagraph>
        )}
      </div>
    </section>
  );
}

