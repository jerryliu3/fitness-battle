"use client";

export function VitalsLabSparkline({
  data,
  color,
  width = 54,
  height = 16,
  active = false,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  active?: boolean;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, idx) => {
    const x = (idx / (data.length - 1)) * (width - 4) + 2;
    const y = height - 3 - ((v - min) / range) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1]?.split(",") ?? ["0", "0"];

  return (
    <svg width={width} height={height} className="vitals-lab-spark" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={active ? 1.75 : 1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(" ")}
        opacity={active ? 1 : 0.75}
      />
      {active ? (
        <>
          <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
          <circle cx={last[0]} cy={last[1]} r="5" fill={color} opacity="0.28" />
        </>
      ) : null}
    </svg>
  );
}
