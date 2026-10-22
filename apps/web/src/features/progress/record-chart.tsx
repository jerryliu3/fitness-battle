"use client";
import {
  formatClockTime,
  personalRecordChart,
  APP_TIMEZONE,
  type RecordAttempt,
} from "@fitness-battle/shared";
const date = (at: string) =>
  new Date(at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
export function RecordChart({
  rows,
  selected,
  now,
  onSelect,
}: {
  rows: RecordAttempt[];
  selected: string;
  now: Date;
  onSelect: (id: string) => void;
}) {
  const chart = personalRecordChart(rows, now);
  if (!chart) return null;
  return (
    <div className="record-chart">
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="group"
        aria-label="Personal record timeline, lower time is faster"
      >
        {chart.ticks.map((t) => (
          <g key={t.seconds}>
            <line
              x1={chart.left}
              x2={chart.right}
              y1={t.y}
              y2={t.y}
              stroke="#e0e5dc"
            />
            <text
              x={chart.left - 8}
              y={t.y + 4}
              textAnchor="end"
              fill="#616c63"
              fontSize={10}
            >
              {formatClockTime(t.seconds)}
            </text>
          </g>
        ))}
        <path
          d={chart.path}
          fill="none"
          stroke="#282f2c"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {chart.points.map((p) => (
          <g
            key={p.activityId}
            role="button"
            tabIndex={0}
            aria-label={`${date(p.startedAt)}, ${formatClockTime(p.seconds)}`}
            aria-pressed={selected === p.activityId}
            onClick={() => onSelect(p.activityId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(p.activityId);
              }
            }}
            className="record-chart-point"
          >
            <circle cx={p.x} cy={p.y} r={20} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={selected === p.activityId ? 6 : 4}
              fill={selected === p.activityId ? "#282f2c" : "#fff"}
              stroke="#282f2c"
              strokeWidth={2}
            />
          </g>
        ))}
        <text x={chart.points.length===1?(chart.left+chart.right)/2:chart.left} textAnchor={chart.points.length===1?"middle":"start"} y={chart.height - 8} fill="#616c63" fontSize={10}>
          {date(chart.start)}
        </text>
        <text
          x={chart.right}
          y={chart.height - 8}
          textAnchor="end"
          fill="#616c63"
          fontSize={10}
        >
          {chart.points.length>1?date(chart.end):""}
        </text>
      </svg>
    </div>
  );
}
