import { NextResponse } from "next/server";
import { loadRaceResults } from "@/lib/race-results";
import { raceQuery, RACE_DISTANCES } from "@fitness-battle/shared";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const distance = RACE_DISTANCES.find(d => d.slug === params.get("distance"));
  if (!distance) return NextResponse.json({ error: "Invalid distance" }, { status: 400 });
  const query = raceQuery(params);
  if (query.editionError) return NextResponse.json({error:query.editionError},{status:400});
  if (query.dateError) return NextResponse.json({error:query.dateError},{status:400});
  const rawPageSize = Number(params.get("pageSize"));
  const pageSize = Number.isInteger(rawPageSize) && rawPageSize >= 1 && rawPageSize <= 50 ? rawPageSize : 50;
  try {
    if (pageSize === 50) {
      const data = await loadRaceResults(distance.stored, query);
      return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" } });
    }
    const startOffset = (query.page - 1) * pageSize;
    const endOffset = startOffset + pageSize;
    const firstDbPage = Math.floor(startOffset / 50) + 1;
    const lastDbPage = Math.floor(Math.max(startOffset, endOffset - 1) / 50) + 1;
    const first = await loadRaceResults(distance.stored, { ...query, page: firstDbPage });
    let combined = first.rows;
    if (lastDbPage > firstDbPage && combined.length === 50) {
      const second = await loadRaceResults(distance.stored, { ...query, page: lastDbPage });
      combined = combined.concat(second.rows);
    }
    const localStart = startOffset - (firstDbPage - 1) * 50;
    return NextResponse.json(
      { ...first, rows: combined.slice(localStart, localStart + pageSize), page: query.page, pageSize },
      { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ error: "Race results are unavailable. Please try again." }, { status: 503 });
  }
}
