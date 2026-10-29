"use client";
import { AppParagraph, AppText, Section } from "@/ui/section";
import { useMemo, useState } from "react";
import {
  APP_TIMEZONE,
  clampTrainingAnchor,
  competeNow,
  dayKey,
  earliestDataDate,
  formatTrainingHours,
  formatWeeklyCompetitionRange,
  shiftAppDay,
  shiftTrainingMonth,
  sportById,
  defaultTrainingSports,
  normalizeTrainingSports,
  trainingAtlas,
  trainingBuckets,
  trainingRangeNavigation,
  type CompeteState,
  type SportId,
  type TrainingRange,
} from "@fitness-battle/shared";
import { BenchmarkChart } from "@/ui/benchmark-chart";
import { ChartRangeToggle } from "./chart-range-toggle";
import { TrainingSportMenu } from "./training-sport-menu";

export function TrainingAtlas({ state }: { state: CompeteState }) {
  const now = competeNow(state);
  const [sports, setSports] = useState<SportId[]>(() => defaultTrainingSports()),
    [range, setRange] = useState<TrainingRange>("week"),
    [anchor, setAnchor] = useState(() => now),
    [selectedDay, setSelectedDay] = useState<string | null>(null);
  const buckets = trainingBuckets(state.activities, sports, range, anchor, now),
    cells = trainingAtlas(state.activities, sports, anchor, now);
  const day =
    cells.find((d) => d.day === selectedDay) ??
    cells.find((d) => d.day === dayKey(now)) ??
    cells.find((d) => d.inMonth && !d.future);
  const dateLabel =
    range === "week"
      ? formatWeeklyCompetitionRange(anchor)
      : anchor.toLocaleDateString("en-US", {
          timeZone: APP_TIMEZONE,
          ...(range === "year"
            ? { year: "numeric" }
            : { month: "long", year: "numeric" }),
        });
  const earliest = useMemo(() => earliestDataDate(state, now), [state, now]);
  const { prevAllowed, nextAllowed } = trainingRangeNavigation(
    anchor,
    earliest,
    now,
    range,
  );
  const move = (direction: number) => {
    if (direction < 0 && !prevAllowed) return;
    if (direction > 0 && !nextAllowed) return;
    const target =
      range === "week"
        ? shiftAppDay(anchor, direction * 7)
        : shiftTrainingMonth(anchor, direction * (range === "year" ? 12 : 1));
    setAnchor(clampTrainingAnchor(target, earliest, now, range));
    setSelectedDay(null);
  };
  return (
    <Section titleRole="display" title="Your training" className="training-atlas">
      <div className="training-atlas-toolbar">
        <TrainingSportMenu
          value={sports}
          onChange={(next) => {
            setSports(normalizeTrainingSports(next));
          }}
        />
        <ChartRangeToggle
          value={range}
          onChange={(next) => {
            setRange(next);
            setAnchor((current) => clampTrainingAnchor(current, earliest, now, next));
          }}
        />
      </div>
      <div className="atlas-heading">
        <button
          type="button"
          aria-label={`Previous ${range}`}
          disabled={!prevAllowed}
          onClick={() => move(-1)}
        >
          ←
        </button>
        <strong>{dateLabel}</strong>
        <button
          type="button"
          aria-label={`Next ${range}`}
          disabled={!nextAllowed}
          onClick={() => move(1)}
        >
          →
        </button>
      </div>
      <BenchmarkChart key={`${range}:${anchor.toISOString()}:${sports.join(",")}`} buckets={buckets} now={now} dateLabel={dateLabel} />
      <details className="club-calendar">
        <summary>
          Daily activity <span>＋</span>
        </summary>
        <AppParagraph typographyRole="label" className="fb-kicker">
          {anchor.toLocaleDateString("en-US", {
            month: "long",
            timeZone: APP_TIMEZONE,
          })}{" "}
          · daily activity
        </AppParagraph>
        <div className="atlas-chart-scroll">
          <div className="atlas-month">
            <div className="atlas-weekdays" aria-hidden="true">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div
              className="atlas-grid"
              role="group"
              aria-label={`${anchor.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: APP_TIMEZONE })} recorded activity`}
            >
              {cells.map((d) => (
                <button
                  type="button"
                  key={d.day}
                  disabled={!d.inMonth || d.future}
                  data-intensity={d.intensity}
                  aria-label={`${d.day}: ${formatTrainingHours(d.movingSec)} hours, ${d.sessions} ${d.sessions === 1 ? "session" : "sessions"}`}
                  aria-pressed={day?.day === d.day}
                  onClick={() => setSelectedDay(d.day)}
                >
                  {d.inMonth ? d.label : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="atlas-day" aria-live="polite">
          {day ? (
            <>
              <AppParagraph typographyRole="label" className="fb-kicker">
                {new Date(`${day.day}T12:00:00Z`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: APP_TIMEZONE,
                })}{" "}
                · {formatTrainingHours(day.movingSec)} hr
              </AppParagraph>
              {day.activityIds.length ? (
                day.activityIds.map((id) => {
                  const a = state.activities.find((a) => a.id === id)!;
                  return (
                    <details key={id}>
                      <summary>
                        {sportById(a.sport).name}
                        <span>{formatTrainingHours(a.movingSec)} hr</span>
                      </summary>
                      <AppParagraph typographyRole="caption" className="fb-note">
                        {a.source} · {a.verified ? "GPS Tracked" : "Open"}
                      </AppParagraph>
                    </details>
                  );
                })
              ) : (
                <AppParagraph typographyRole="caption" className="fb-note">Nothing recorded.</AppParagraph>
              )}
            </>
          ) : (
            <AppParagraph typographyRole="caption" className="fb-note">No recorded days in this selection.</AppParagraph>
          )}
        </div>
      </details>
      <AppParagraph typographyRole="body" className="atlas-legend">
        <span>Moving time</span>
        <span>
          Less <i data-intensity="0" />
          <i data-intensity="1" />
          <i data-intensity="2" />
          <i data-intensity="3" />
          <i data-intensity="4" /> More
        </span>
      </AppParagraph>
    </Section>
  );
}
