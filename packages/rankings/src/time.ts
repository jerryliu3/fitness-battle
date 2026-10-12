/** Official clock strings such as 30:28, 1:02:03, or 34:27.5. */
export function parseRaceTimeMs(value: string): number | null {
  const match = /^(\d+):(\d{2})(?::(\d{2}))?(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;
  const head = Number(match[1]);
  const mid = Number(match[2]);
  const hasHours = match[3] != null;
  const hours = hasHours ? head : 0;
  const minutes = hasHours ? mid : head;
  const seconds = hasHours ? Number(match[3]) : mid;
  if (minutes > 59 || seconds > 59) return null;
  const fraction = match[4] ? Number(match[4]) / 10 ** match[4].length : 0;
  return Math.round((hours * 3600 + minutes * 60 + seconds + fraction) * 1000);
}

export function formatRaceTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const secondText =
    Math.abs(seconds - Math.round(seconds)) < 0.001
      ? String(Math.round(seconds)).padStart(2, "0")
      : seconds.toFixed(1).padStart(4, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${secondText}`;
  }
  return `${minutes}:${secondText}`;
}
