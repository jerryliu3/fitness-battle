
import { AppParagraph, SectionHeader, AppHeading } from "@/ui/section";
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
  const [women, men] = client
    ? await Promise.all([
        loadBoard(client, stored, "female"),
        loadBoard(client, stored, "male"),
      ])
    : [[], []];
  const sample = women[0] ?? men[0];
  const sources = [...new Set([...women, ...men].map((row) => row.attribution))];

  return (
    <main className="rankings-wrap">
      <header className="rankings-top">
        <Link href="/rankings" className="fb-back">
          ← All distances
        </Link>
        <span className="rankings-kicker">{label}</span>
      </header>
      <AppHeading level={1} role="pageTitle">{label}</AppHeading>
      <AppParagraph typographyRole="body" className="rankings-lede">
        {sample
          ? "Fastest published finishers. Chip time when the source has one, otherwise the official time."
          : "No finishers are published for this distance yet."}
      </AppParagraph>
      <Board title="Women" rows={women} />
      <Board title="Men" rows={men} />
      {sources.length > 0 ? (
        <AppParagraph typographyRole="body" className="rankings-source">{sources.join(" · ")}</AppParagraph>
      ) : null}
    </main>
  );
}

async function loadBoard(
  client: NonNullable<ReturnType<typeof createRankingsClient>>,
  distance: string,
  sex: string,
): Promise<LeaderboardRow[]> {
  const { data, error } = await client.rpc("rankings_top", {
    p_distance: distance,
    p_sex: sex,
    p_limit: 200,
  });
  if (error || !data) return [];
  return data as LeaderboardRow[];
}

function Board({ title, rows }: { title: string; rows: LeaderboardRow[] }) {
  return (
    <section className="rankings-section">
      <SectionHeader title={title}/>
      {rows.length === 0 ? (
        <AppParagraph typographyRole="body" className="rankings-note">No results yet.</AppParagraph>
      ) : (
        <div className="rankings-table-wrap" tabIndex={0} role="region" aria-label={`${title} results, scroll for race details`}>
          <AppParagraph typographyRole="body" className="rankings-overflow-hint">Swipe for race details ↔</AppParagraph>
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
                <th scope="col">Race</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>{row.athlete_name}</td>
                  <td>{formatRaceTime(row.rank_time_ms)}</td>
                  <td>{clockLabel(row.rank_clock)}</td>
                  <td>
                    {row.event_name.includes(String(row.edition_year))
                      ? row.event_name
                      : `${row.event_name} ${row.edition_year}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
