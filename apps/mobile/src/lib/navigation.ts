import { shellTabFromPath } from "@fitness-battle/shared";

/** Settings now live outside the Progress tab; preserve their active stack. */
export function isAthleteSettingsPath(path: string): boolean {
  return [
    "/athlete",
    "/athlete-settings",
    "/settings",
    "/notifications",
  ].includes(path);
}

export function canOpenCompeteNotice(path: string): boolean {
  return (
    !isAthleteSettingsPath(path) &&
    path !== "/onboarding" &&
    path !== "/crew-members" &&
    shellTabFromPath(path)?.id !== "you"
  );
}
