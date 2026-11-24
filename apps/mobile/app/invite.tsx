import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { stashPendingCrewInvite } from "../src/lib/guest-entry";
import { useOnboardingRequired } from "../src/lib/onboarding-navigation";

export default function CrewInvite() {
  const { invite } = useLocalSearchParams<{ invite?: string | string[] }>();
  const code = (Array.isArray(invite) ? invite[0] : invite)?.trim().toUpperCase() ?? "";
  const { pending, required } = useOnboardingRequired();

  useEffect(() => {
    if (code) void stashPendingCrewInvite(code);
  }, [code]);

  if (!code) return <Redirect href="/field" />;
  if (pending) return null;

  if (required) {
    return <Redirect href={{ pathname: "/welcome", params: { invite: code } }} />;
  }

  return <Redirect href={{ pathname: "/field", params: { invite: code } }} />;
}