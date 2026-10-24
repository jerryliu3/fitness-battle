import type { SportId } from "./compete/sports";

/** Short label for compact activity / list icons (not a sport picker). */
export function sportActivityMark(id: SportId): string {
  switch (id) {
    case "running":
      return "Run";
    case "cycling":
      return "Ride";
    case "walking":
      return "Walk";
    case "strength":
      return "Lift";
    default:
      return "Go";
  }
}
