import { competeNow, formatVolume, weeklyBoard } from "./engine";
import { fieldPinMatchesEnrollment } from "../matching/field-plan";
import type { CompeteState, SportId, UnitSystem } from "./sports";

export interface SeenRival {
  id: string;
  name: string;
  distanceM: number;
  movingSec: number;
}

export interface SeenField {
  version: 1;
  accountKey: string;
  sport: SportId;
  periodStart: string;
  youDistanceM: number;
  youMovingSec: number;
  youPlace: number;
  units: UnitSystem;
  rivals: SeenRival[];
}

export interface FieldNotice {
  title: string;
  personal: boolean;
  rival: boolean;
}

export function fieldSeenStorageKey(accountKey: string): string {
  return `fb-field-seen:${accountKey}`;
}

export function seenFieldFromState(
  state: CompeteState,
  accountKey: string,
  now: Date = competeNow(state),
): SeenField | null {
  const sport = state.primary;
  const enrollment = state.enrollments.find((item) => item.sport === sport);
  if (!enrollment) return null;
  const board = weeklyBoard(state, sport, "open", now);
  const you = board.find((row) => row.you);
  if (!you) return null;
  const pin =
    state.crewBoard && fieldPinMatchesEnrollment(state.crewBoard, enrollment)
      ? state.crewBoard
      : null;
  const rivals = (pin?.members ?? [])
    .filter((member) => member.id !== accountKey)
    .map((member) => ({
      id: member.id,
      name: member.name,
      distanceM: member.distanceM ?? 0,
      movingSec: member.movingSec ?? 0,
    }));
  return {
    version: 1,
    accountKey,
    sport,
    periodStart: enrollment.waveStart,
    youDistanceM: you.distanceM,
    youMovingSec: you.movingSec,
    youPlace: you.place,
    units: state.units,
    rivals,
  };
}

export function readSeenField(raw: string | null): SeenField | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SeenField;
    if (parsed?.version !== 1 || !Array.isArray(parsed.rivals)) return null;
    return { ...parsed, units: parsed.units === "metric" ? "metric" : "us" };
  } catch {
    return null;
  }
}

function gained(before: number, after: number): boolean {
  return after - before > 1;
}

function volumeGain(
  sport: SportId,
  distanceM: number,
  movingSec: number,
  units: UnitSystem,
): string {
  return formatVolume(sport, Math.max(0, distanceM), Math.max(0, movingSec), units);
}

/**
 * Explain a real change since the last acknowledged field.
 * Synthetic solo estimates and unchanged polls return null.
 * A different account, sport, or period is not a gain.
 */
export function fieldChangeNotice(
  previous: SeenField | null,
  next: SeenField,
): FieldNotice | null {
  if (!previous) return null;
  if (
    previous.accountKey !== next.accountKey ||
    previous.sport !== next.sport ||
    previous.periodStart !== next.periodStart
  ) {
    return null;
  }

  if (previous.units !== next.units) {
    const rivalsUnchanged = next.rivals.every((rival) => {
      const before = previous.rivals.find((item) => item.id === rival.id);
      return (
        before &&
        before.distanceM === rival.distanceM &&
        before.movingSec === rival.movingSec
      );
    });
    if (
      previous.youDistanceM === next.youDistanceM &&
      previous.youMovingSec === next.youMovingSec &&
      rivalsUnchanged
    ) {
      return null;
    }
  }

  const personal =
    gained(previous.youDistanceM, next.youDistanceM) ||
    gained(previous.youMovingSec, next.youMovingSec);
  const moves = next.rivals.flatMap((rival) => {
    const before = previous.rivals.find((item) => item.id === rival.id);
    if (!before) return [];
    const distanceM = rival.distanceM - before.distanceM;
    const movingSec = rival.movingSec - before.movingSec;
    if (!gained(before.distanceM, rival.distanceM) && !gained(before.movingSec, rival.movingSec)) {
      return [];
    }
    return [{ name: rival.name, distanceM, movingSec }];
  });
  if (!personal && moves.length === 0) return null;

  const place =
    next.youPlace === previous.youPlace
      ? `#${next.youPlace}`
      : `#${previous.youPlace} → #${next.youPlace}`;
  const parts: string[] = [];
  if (personal) {
    parts.push(
      `+${volumeGain(
        next.sport,
        next.youDistanceM - previous.youDistanceM,
        next.youMovingSec - previous.youMovingSec,
        next.units,
      )} counted`,
    );
  }
  if (moves.length === 1) {
    const move = moves[0]!;
    parts.push(
      `${move.name} added ${volumeGain(next.sport, move.distanceM, move.movingSec, next.units)}`,
    );
  } else if (moves.length > 1) {
    parts.push(`${moves.length} competitors moved`);
  }
  parts.push(place);
  return {
    title: parts.join(" · "),
    personal,
    rival: moves.length > 0,
  };
}
