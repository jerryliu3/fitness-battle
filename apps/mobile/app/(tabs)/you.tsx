import { Redirect, useLocalSearchParams } from "expo-router";
import { ProgressScreen } from "../../src/features/progress-screen";

export default function ProgressTab() {
  const params = useLocalSearchParams<{
    panel?: string;
    tracker?: string;
    provider?: string;
  }>();
  // Keep existing tracker callbacks and settings deep links working after the
  // Athlete destination moved out of the tab bar.
  if (params.tracker || (params.panel && params.panel !== "progress")) {
    return <Redirect href={{ pathname: "/athlete", params }} />;
  }
  return <ProgressScreen />;
}
