import type { SportId } from "@fitness-battle/shared";
import { AppIcon } from "./app-icon";

export function SportIcon({ sport, size = 24 }: { sport: SportId; size?: number }) {
  return <AppIcon name={sport} size={size} />;
}
