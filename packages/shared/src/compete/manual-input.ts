import { sportById, type SportId } from "./sports";

/** Shared web/native form contract; accepts decimal-keyboard commas, never blank mileage. */
export function parseManualActivity(sport: SportId, mileage: string, duration: string):
  | { distanceM: number; movingSec: number; error: null }
  | { error: string } {
  const decimal = (value: string) => {
    const input = value.trim();
    return /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(input) ? Number(input.replace(",", ".")) : NaN;
  };
  const movingSec = decimal(duration) * 60;
  if (!Number.isFinite(movingSec) || movingSec <= 0 || movingSec > 86400)
    return { error: "Enter a duration greater than 0 and no more than 1,440 minutes." };
  const distanceM = sportById(sport).gps ? decimal(mileage) * 1609.344 : 0;
  if (!Number.isFinite(distanceM) || distanceM < 0 || distanceM > 2_000_000)
    return { error: "Enter mileage between 0 and 1,242 miles." };
  return { distanceM, movingSec, error: null };
}
