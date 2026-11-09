import "server-only";
import { raceDateBounds } from "@fitness-battle/shared";
import type { RaceResultsPage, raceQuery } from "@fitness-battle/shared";
import { createRankingsClient } from "./rankings";

export async function loadRaceResults(distance: string, query: ReturnType<typeof raceQuery>): Promise<RaceResultsPage> {
  const client = createRankingsClient();
  if (!client) throw new Error("Rankings are not configured");
  if (query.editionError) throw new Error(query.editionError);
  const bounds = raceDateBounds(query);
  const { data, error } = await client.rpc("rankings_page_scoped", {
    p_distance: distance, p_sex: query.sex, p_year: query.year,
    p_edition_id: query.editionId, p_query: query.query, p_page: query.page, p_from: bounds.from, p_until: bounds.until,
  });
  if (error || !data) throw new Error("Rankings unavailable");
  return data as RaceResultsPage;
}

export async function loadRaceReport(id: number): Promise<import("@fitness-battle/shared").RaceResultReport | null> {
  const client = createRankingsClient();
  if (!client) throw new Error("Rankings are not configured");
  const { data, error } = await client.rpc("rankings_result_with_identity", { p_id: id });
  if (error) throw new Error("Result unavailable");
  return data;
}

export async function loadSavedRaceResults(ids: number[]): Promise<import("@fitness-battle/shared").SavedRaceResult[]> {
  const client = createRankingsClient();
  if (!client) throw new Error("Rankings are not configured");
  const { data, error } = await client.rpc("rankings_saved", { p_ids: ids });
  if (error || !Array.isArray(data)) throw new Error("Results unavailable");
  return data;
}

export async function loadRaceCoverage(): Promise<import("@fitness-battle/shared").RaceCoverage[]> {
  const client = createRankingsClient();
  if (!client) throw new Error("Rankings are not configured");
  const {data,error} = await client.rpc("rankings_coverage");
  if (error || !Array.isArray(data)) throw new Error("Coverage unavailable");
  return data;
}

export async function loadEditionHistory(edition:number,distance:string,sex:string):Promise<import("@fitness-battle/shared").RaceEditionTrend[]> {
  const client=createRankingsClient();
  if(!client) throw new Error("Rankings unavailable");
  const {data,error}=await client.rpc("rankings_edition_history",{p_edition_id:edition,p_distance:distance,p_sex:sex});
  if(error || !Array.isArray(data)) throw new Error("History unavailable");
  return data;
}

export async function loadAthleteHistory(id:number,page:number):Promise<import("@fitness-battle/shared").RaceAthleteHistory | null> {
  const client=createRankingsClient();
  if(!client) throw new Error("Rankings unavailable");
  const {data,error}=await client.rpc("rankings_athlete_page",{p_athlete_id:id,p_page:page});
  if(error) throw new Error("Athlete history unavailable");
  return data;
}
