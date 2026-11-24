import { Redirect, useLocalSearchParams } from "expo-router";

/** Universal link alias for `https://overtaek.xyz/app/athlete?id=…`. */
export default function WebAthleteAlias() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const viewed = typeof id === "string" ? id.trim() : "";
  if (viewed) return <Redirect href={{ pathname: "/athlete-profile", params: { id: viewed } }} />;
  return <Redirect href="/athlete" />;
}