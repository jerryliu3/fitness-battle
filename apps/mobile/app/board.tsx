import { Redirect } from "expo-router";

/** Push notifications and legacy links use `/board` on web middleware. */
export default function BoardAlias() {
  return <Redirect href="/arena" />;
}