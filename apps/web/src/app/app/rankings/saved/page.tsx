"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { raceClock, type SavedRaceResult } from "@fitness-battle/shared";
import { useRaceFavorites } from "../favorites";
export default function SavedResultsPage() {
  const saved = useRaceFavorites();
  const ids = saved.ids.join(",");
  const [rows, setRows] = useState<SavedRaceResult[]>([]);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState<number[]>([]);
  const selected = selection.filter(id => saved.ids.includes(id) && rows.some(row => row.id === id));
  useEffect(() => {
    if (!saved.ready) return;
    if (!ids) { setRows([]); setBusy(false); setFailed(false); return; }
    const controller = new AbortController();
    setBusy(true); setFailed(false); setRows([]);
    fetch(`/api/rankings/saved?ids=${ids}`, {signal:controller.signal})
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<SavedRaceResult[]>; })
      .then(value => { if (!controller.signal.aborted) setRows(value); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [ids, saved.ready, retry]);
  return <main className="rankings-wrap race-explorer"><header className="rankings-top"><Link href="/rankings">← Race rankings</Link><span className="rankings-kicker">Saved on this browser</span></header><h1>Saved results</h1>
    {saved.error && <p role="alert">{saved.error} {!saved.ready && <button onClick={() => void saved.reload()}>Retry</button>}</p>}
    {busy && !saved.error ? <p role="status">Loading saved results…</p> : failed ? <div role="alert"><p>Saved results are unavailable.</p><button onClick={() => setRetry(n => n+1)}>Retry</button></div> : <section className="race-neighbors">
      {!saved.ids.length && <p>Save a result from its race report to find it here.</p>}
      {saved.ids.map(id => { const row = rows.find(r => r.id === id); return <div key={id} className="race-saved-row">{row && <input className="race-compare-check" type="checkbox" aria-label={`Compare ${row.athlete_name}, ${row.event_name}`} checked={selected.includes(id)} disabled={!selected.includes(id) && selected.length >= 2} onChange={() => setSelection(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id])} />}{row ? <Link href={`/rankings/result/${id}`}><span>{row.athlete_name}<small>{row.event_name} · {row.edition_year}</small></span><strong>{raceClock(row.rank_time_ms)}</strong></Link> : <span>Result unavailable</span>}<button disabled={saved.busy} aria-label={row ? `Remove ${row.athlete_name} from saved results` : "Remove unavailable result"} onClick={() => void saved.toggle(id)}>Remove</button></div>; })}
      {rows.length > 1 && <div className="race-compare-tray"><p>{selected.length} of 2 results selected</p>{selected.length === 2 ? <Link href={`/rankings/compare?first=${selected[0]}&second=${selected[1]}`}>Compare results →</Link> : <span>Select two results to compare</span>}</div>}
    </section>}
  </main>;
}
