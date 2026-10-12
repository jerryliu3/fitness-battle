import Link from "next/link";
import { notFound } from "next/navigation";
import { formatRaceTime } from "@fitness-battle/rankings";
import {
  DISTANCES,
  clockLabel,
  createRankingsClient,
  distanceSlug,
  type LeaderboardRow,
} from "@/lib/rankings";

export const dynamic = "force-dynamic";

export default async function DistanceBoardPage({
  params,
}: {
  params: Promise<{ distance: string }>;
}) {
  const { distance } = await params;
  const stored = distanceSlug(distance);
  const label = DISTANCES.find((item) => item.slug === distance)?.label;
  if (!stored || !label) notFound();

  const client = createRankingsClient();
  let rows: LeaderboardRow[] = [];
  if (client) {
    const { data, error } = await client
      .from("leaderboard_entries")
      .select("*")
      .eq("distance_slug", stored)
      .order("rank_time_ms", { ascending: true })
      .limit(1000);
    if (!error && data) rows = data as LeaderboardRow[];
  }

  const women = rows.filter((row) => row.sex === "female");
  const men = rows.filter((row) => row.sex === "male");
  const sample = rows[0];

  return (
    <main className="rankings-wrap">
      <header className="rankings-top">
        <Link href="/rankings">All distances</Link>
        <span className="rankings-kicker">{label}</span>
      </header>
      <h1>{label}</h1>
      <p className="rankings-lede">
        {sample
          ? `${sample.event_name}. Ranked by ${clockLabel(sample.rank_clock).toLowerCase()}.`
          : "No finishers are published for this distance yet."}
      </p>
      <Board title="Women" rows={women} />
      <Board title="Men" rows={men} />
      {sample ? (
        <p className="rankings-source">
          {sample.attribution}{" "}
          <a href={sample.source_url}>Source results</a>.{" "}
          <a href="https://www.opendatacommons.org/licenses/odbl/">Open Database License</a>.
        </p>
      ) : null}
    </main>
  );
}

function Board({ title, rows }: { title: string; rows: LeaderboardRow[] }) {
  return (
    <section className="rankings-section">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="rankings-note">No results yet.</p>
      ) : (
        <table className="rankings-table">
          <caption className="rankings-kicker">
            {title}, fastest official time first
          </caption>
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Athlete</th>
              <th scope="col">Time</th>
              <th scope="col">Clock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{row.athlete_name}</td>
                <td>{formatRaceTime(row.rank_time_ms)}</td>
                <td>{clockLabel(row.rank_clock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
