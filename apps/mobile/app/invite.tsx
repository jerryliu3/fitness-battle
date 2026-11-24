import { Redirect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../src/lib/auth";
import { useOnboardingRequired } from "../src/lib/onboarding-navigation";

export default function CrewInvite() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const { user } = useAuth();
  const { pending, required } = useOnboardingRequired();

  if (pending || required) return null;
  if (!invite) return <Redirect href="/field" />;
  return <Redirect href={{ pathname: "/field", params: { invite } }} />;
}
