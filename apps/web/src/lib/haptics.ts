import { type HapticCue } from "@fitness-battle/shared";

/** Web has no tactile motor; keep call sites shared with native. */
export async function playCue(
  _kind: HapticCue,
  _options?: { controlAlreadyPlayed?: boolean },
): Promise<void> {}
