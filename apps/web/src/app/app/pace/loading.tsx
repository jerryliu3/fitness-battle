export default function Loading() {
  return <main className="rankings-wrap" role="status" aria-label="Loading race results"><div className="race-skeleton race-skeleton-title" />{Array.from({length: 6}, (_, i) => <div key={i} className="race-skeleton" />)}</main>;
}
