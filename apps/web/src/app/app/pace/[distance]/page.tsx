import PaceDistance from "../pace-distance";
export const dynamic="force-dynamic";
export default function DistanceBoardPage(props:{params:Promise<{distance:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  return <PaceDistance {...props} />;
}
