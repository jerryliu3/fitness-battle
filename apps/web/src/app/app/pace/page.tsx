import PaceDistance from "./pace-distance";
import {RACE_DISTANCES} from "@fitness-battle/shared";
export const dynamic="force-dynamic";
export default async function PacePage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const raw=await searchParams;
  const distance=RACE_DISTANCES.find(d=>d.slug===raw.distance)?.slug ?? "5k";
  return <PaceDistance params={Promise.resolve({distance})} searchParams={Promise.resolve(raw)} home />;
}
