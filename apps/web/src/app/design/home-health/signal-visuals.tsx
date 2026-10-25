/** Fictional, isolated design-study readings. These never enter production state. */
const series = [
  { values: [414, 456, 438, 462, 450, 480, 462], unit: "minutes", range: "6h 54m–8h", value: "7h 42m" },
  { values: [6300, 9100, 5800, 10400, 7600, 11300, 8450], unit: "steps", range: "5,800–11,300", value: "8,450" },
  { values: [54, 51, 53, 50, 52, 49, 52], unit: "bpm", range: "49–54 bpm", value: "52" },
  { values: [49, 53, 47, 62, 55, 61, 58], unit: "ms", range: "47–62 ms", value: "58" },
];
const dates = ["Sun 18", "Mon 19", "Tue 20", "Wed 21", "Thu 22", "Fri 23", "Sat 24"];
function polar(angle: number, radius = 54) {
  const rad = angle * Math.PI / 180;
  return { x: 72 + Math.cos(rad) * radius, y: 72 + Math.sin(rad) * radius };
}
function arc(start: number, end: number) {
  const from = polar(start), to = polar(end);
  return `M${from.x},${from.y} A54,54 0 ${end - start > 180 ? 1 : 0} 1 ${to.x},${to.y}`;
}
export function SignalVisual({ kind, index, unavailable }: { kind: "dials" | "halos"; index: number; unavailable: boolean }) {
  const metric = series[index];
  const low = Math.min(...metric.values), high = Math.max(...metric.values);
  const fraction = (metric.values[6] - low) / Math.max(1, high - low);
  const marker = polar(135 + fraction * 270);
  return <>
    <div className="signal-visual">
      <svg viewBox="0 0 144 144" aria-hidden="true">
        {kind === "dials" ? <>
          <path d={arc(135, 405)} fill="none" stroke="#31505a" strokeWidth="7" strokeLinecap="round"/>
          {[0, .25, .5, .75, 1].map(position => {
            const outer = polar(135 + position * 270, 65), inner = polar(135 + position * 270, 61);
            return <line key={position} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke="#91a9b2" strokeWidth="1"/>;
          })}
          {!unavailable && <circle cx={marker.x} cy={marker.y} r="6" fill="#f7c948" stroke="#142b3b" strokeWidth="3"/>}
        </> : <>
          <circle cx="72" cy="72" r="54" fill="none" stroke="#31505a" strokeDasharray="1 6"/>
          {metric.values.map((value, i) => {
            const point = polar(-90 + i * 360 / 7);
            return <circle key={i} cx={point.x} cy={point.y} r={unavailable ? 4 : 4 + (value - low) / Math.max(1, high - low) * 5}
              fill={unavailable ? "#31505a" : i === 6 ? "#f7c948" : "#b6cfb5"} opacity={unavailable || i === 6 ? 1 : .65}/>;
          })}
        </>}
      </svg>
      <span className="signal-visual-center"><strong>{unavailable ? "—" : metric.value}</strong><small>{unavailable ? "No reading" : "Latest"}</small></span>
    </div>
    <span className="signal-range">{unavailable ? "No observed range" : metric.range}</span>
    <span className="signal-method">{unavailable ? "Waiting for readings" : kind === "dials" ? "Observed 7-day range" : "7 daily readings · clockwise"}</span>
  </>;
}
export function SignalVisualDetail({ kind, index, unavailable }: { kind: "dials" | "halos"; index: number; unavailable: boolean }) {
  if (unavailable) return <p>No reading or observed range is available. The marker and values disappear; an empty ring is not a zero.</p>;
  const metric = series[index];
  return <>
    <p>{kind === "dials"
      ? "The gold dot places the latest sample within this person's observed seven-day range. The unfilled dial is a range, not progress toward a target."
      : "Seven dots run clockwise from the top, oldest to newest. Size represents the reading within this sample's observed range; gold marks the latest. It is a record of variation, not a score."}</p>
    <dl className="signal-reading-list">{metric.values.map((value, i) => <div key={i}><dt>{dates[i]}</dt><dd>{value.toLocaleString("en-US")} {metric.unit}</dd></div>)}</dl>
    <p>Fictional observations only. No medical reference range, readiness score or goal is implied.</p>
  </>;
}
