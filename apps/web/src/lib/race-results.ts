import "server-only";
import type { RaceResultsPage, raceQuery } from "@fitness-battle/shared";
import { createRankingsClient } from "./rankings";

export async function loadRaceResults(distance: string, query: ReturnType<typeof raceQuery>): Promise<RaceResultsPage> {
  const client = createRankingsClient();
  if (!client) throw new Error("Rankings are not configured");
  const { data, error } = await client.rpc("rankings_page", {
    p_distance: distance, p_sex: query.sex, p_year: query.year,
    p_query: query.query, p_page: query.page,
  });
  if (error || !data) throw new Error("Rankings unavailable");
  return data as RaceResultsPage;
}
