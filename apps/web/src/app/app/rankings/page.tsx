
import { AppParagraph, AppHeading } from "@/ui/section";
import Link from "next/link";
import { DISTANCES, createRankingsClient } from "@/lib/rankings";

export const dynamic = "force-dynamic";

export default async function RankingsHomePage() {
  const client = createRankingsClient();
  const counts = new Map<string, number>();
  if (client) {
    const { data } = await client
      .from("rankings_distance_stats")
      .select("distance_slug, result_count");
    for (const row of data ?? []) {
      counts.set(row.distance_slug, Number(row.result_count) || 0);
    }
  }

  return (
    <main className="rankings-wrap">
      <header className="rankings-top">
        <Link href="/you" className="club-icon-button" aria-label="Return to Progress">
          ‹
        </Link>
        <span className="rankings-kicker">Race Rankings</span>
      </header>
      <AppHeading level={1} role="display">Road leaderboards</AppHeading>
      <AppParagraph typographyRole="body" className="rankings-lede">
        Finishers from audited public results, split by distance and sex. The
        clock is chip time when the source provides one, otherwise the official
        time. People under 18 are not stored.
      </AppParagraph>
      <ul className="rankings-boards">
        {DISTANCES.map((distance) => {
          const stored =
            distance.slug === "half-marathon" ? "half_marathon" : distance.slug;
          const count = counts.get(stored) ?? 0;
          return (
            <li key={distance.slug}>
              {count > 0 ? (
                <Link href={`/rankings/${distance.slug}`}>
                  <strong>{distance.label}</strong>
                  <span>
                    {count} {count === 1 ? "result" : "results"}
                  </span>
                </Link>
              ) : (
                <div className="rankings-empty-card">
                  <strong>{distance.label}</strong>
                  <span>No results yet</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <AppParagraph typographyRole="body" className="rankings-note">
        The count is every published finisher. A distance page shows the fastest
        200 women and 200 men. The same person can appear twice until results
        are linked across events.
        {client
          ? ""
          : " The rankings database is not configured in this environment."}
      </AppParagraph>
    </main>
  );
}
