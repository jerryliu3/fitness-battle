import { Redirect, useLocalSearchParams } from "expo-router";

/** Universal link alias for `https://overtaek.xyz/app/field?invite=…`. */
export default function WebFieldAlias() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const code = typeof invite === "string" ? invite.trim() : "";
  if (code) return <Redirect href={{ pathname: "/field", params: { invite: code } }} />;
  return <Redirect href="/field" />;
}