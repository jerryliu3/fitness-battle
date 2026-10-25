"use client";
import { ChartSvg, ChartText } from "@/ui/chart-text";
import { typographyStyle } from "@/ui/section";

import { weeklyHoursComparison, type CompeteState } from "@fitness-battle/shared";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ActivityActions } from "./activity-actions";
import { AnimatedPolygon, AnimatedPolyline } from "./activity-chart";
import { ChartFrame } from "@/ui/chart-frame";
export function WeekChart({ state, detail = false, ready = true }: { state: CompeteState; detail?: boolean; ready?: boolean }) {
  const { nowDayIndex, currCumulativeHours, prevCumulativeHours, currTotalHours, prevTotalHours, sessionCount, weekProgress } = weeklyHoursComparison(state);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const reduced = useReducedMotion();
  // SVG chart geometry
  const chartW = 340;
  const chartH = 132;
  const xStart = 34;
  const xEnd = 324;
  const yTop = 14;
  const yBottom = 100;
  const yMidPos = Math.round((yTop + yBottom) / 2);

  const maxVal = Math.max(...currCumulativeHours, ...prevCumulativeHours, 0.5);
  const yMax = Math.max(1, Math.ceil(maxVal * 1.15));
  const yMid = Math.round((yMax / 2) * 10) / 10;

  const getY = (hrs: number) =>
    yBottom - (Math.min(hrs, yMax) / yMax) * (yBottom - yTop);
  const getX = (dayIdx: number) =>
    xStart + ((dayIdx + 1) / 7) * (xEnd - xStart);
  const getDayCenterX = (dayIdx: number) =>
    xStart + ((dayIdx + 0.5) / 7) * (xEnd - xStart);

  // Continuous X coordinate reflecting exact progress through the week
  const currPreciseX = Number(
    (xStart + weekProgress * (xEnd - xStart)).toFixed(1),
  );
  const currLastY = getY(currTotalHours);

  const prevPoints = [
    `${xStart.toFixed(1)},${getY(0).toFixed(1)}`,
    ...prevCumulativeHours.map(
      (h, i) => `${getX(i).toFixed(1)},${getY(h).toFixed(1)}`,
    ),
  ].join(" ");

  const currPointsList = [
    `${xStart.toFixed(1)},${getY(0).toFixed(1)}`,
    ...currCumulativeHours
      .slice(0, nowDayIndex)
      .map((h, i) => `${getX(i).toFixed(1)},${getY(h).toFixed(1)}`),
    `${currPreciseX.toFixed(1)},${currLastY.toFixed(1)}`,
  ];
  const currLinePoints = currPointsList.join(" ");
  const currAreaPoints = `${currLinePoints} ${currPreciseX.toFixed(1)},${yBottom} ${xStart.toFixed(1)},${yBottom}`;

  const prevLastY = getY(prevTotalHours);

  return (
    <ChartFrame ready={ready}>
      <motion.section initial={detail && !reduced ? { scale: .94, y: 16, opacity: .8 } : false} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ duration: reduced ? 0 : .3 }} className="focus-stats-card" aria-label="This week's progress">
        <div className="focus-stats-header">
          <div>

            <div className="focus-stats-numbers">
              <strong>
                {currTotalHours === 0
                  ? "0 hours"
                  : `${currTotalHours.toFixed(1)} hrs`}
              </strong>
              <span className="focus-stats-session-count">
                {sessionCount}{" "}
                {sessionCount === 1 ? "session" : "sessions"}
              </span>
            </div>
          </div>
          <ActivityActions compact />
        </div>

        <div className="focus-activity-chart-wrap" style={{ position: "relative" }}>
          <ChartSvg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="focus-activity-svg"
            role="img"
            aria-label={`Cumulative hours: ${currTotalHours === 0 ? "0 hours" : `${currTotalHours.toFixed(1)} hrs`} this week compared to ${prevTotalHours.toFixed(1)} hrs last week`}
          >
            <defs>
              <linearGradient
                id="focus-activity-grad"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#f1c75b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f1c75b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines & Y-axis labels */}
            <ChartText
              x="26"
              y={yTop + 4}
              textAnchor="end"

              fill="#616c63"

            >
              {yMax}h
            </ChartText>
            <line
              x1={xStart}
              y1={yTop}
              x2={xEnd}
              y2={yTop}
              className="focus-activity-gridline"
              strokeDasharray="3 3"
            />

            <ChartText
              x="26"
              y={yMidPos + 3}
              textAnchor="end"

              fill="#616c63"

            >
              {yMid}h
            </ChartText>
            <line
              x1={xStart}
              y1={yMidPos}
              x2={xEnd}
              y2={yMidPos}
              className="focus-activity-gridline"
              strokeDasharray="3 3"
            />

            <ChartText
              x="26"
              y={yBottom + 3}
              textAnchor="end"

              fill="#616c63"

            >
              0h
            </ChartText>
            <line
              x1={xStart}
              y1={yBottom}
              x2={xEnd}
              y2={yBottom}
              className="focus-activity-gridline"
            />

            {/* Previous week baseline (dashed line across the week) */}
            <polyline
              points={prevPoints}
              className="focus-activity-line-prev"
            />

            {/* Current week area fill & line */}
            <AnimatedPolygon
              points={currAreaPoints}
              className="focus-activity-area"
              reduced={Boolean(reduced)}
            />
            <AnimatedPolyline
              points={currLinePoints}
              className="focus-activity-line-curr"
              reduced={Boolean(reduced)}
            />

            {/* Live pulsing dot indicator at exact time point */}
            <circle
              cx={currPreciseX}
              cy={currLastY}
              r="6.5"
              fill="none"
              stroke="#f1c75b"
              strokeWidth="2"
              className="focus-trend-pulse"
            />
            <circle cx={currPreciseX} cy={currLastY} r="3.5" fill="#f1c75b" />

            {/* Direct on-chart label: Last week at the end of the baseline */}
            <ChartText
              x={xEnd}
              y={
                Math.abs(currPreciseX - xEnd) < 55 && Math.abs(currLastY - prevLastY) < 18
                  ? Math.min(yBottom - 6, prevLastY + 12)
                  : Math.max(yTop + 10, prevLastY - 6)
              }
              textAnchor="end"

              fill="#616c63"
            >
              Last week
            </ChartText>

            {/* X-axis day labels */}
            {dayLabels.map((lbl, i) => {
              const cx = getDayCenterX(i);
              const isToday = i === nowDayIndex;
              return (
                <ChartText
                  key={i}
                  x={cx}
                  y={yBottom + 18}
                  textAnchor="middle"

                  fill={isToday ? "#282f2c" : "#616c63"}
                >
                  {lbl}
                </ChartText>
              );
            })}
          </ChartSvg>
          {!detail && <Link href="/week" aria-label="Explore your week" style={{ position: "absolute", inset: 0, borderRadius: 14 }} />}
        </div>
      </motion.section>
    </ChartFrame>
  );
}
