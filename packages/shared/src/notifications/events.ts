import type {
  NotificationCategoryId,
  NotificationDeliveryPayload,
} from "./types";

/** Product copy for account push events. */
export function notificationEvent(
  category: NotificationCategoryId,
  detail?: { place?: number; provider?: string; sport?: string },
): NotificationDeliveryPayload {
  switch (category) {
    case "week_summary":
      return {
        category,
        title: "Week settled",
        body:
          detail?.place != null
            ? `Your week closed at place ${detail.place}. Open Overtaek for the board.`
            : "Your week just closed. Open Overtaek for the board.",
        path: "/board",
      };
    case "rival_moves":
      return {
        category,
        title: "Board moved",
        body:
          detail?.place != null
            ? `You’re now place ${detail.place}. Someone nearby jumped ahead.`
            : "Someone nearby jumped the board.",
        path: "/board",
      };
    case "lesson_reminder":
      return {
        category,
        title: "Today’s lesson is open",
        body: detail?.sport
          ? `Still time for your ${detail.sport} lesson.`
          : "Still time for today’s lesson.",
        path: "/",
      };
    case "connection_alerts":
      return {
        category,
        title: "Tracker needs attention",
        body: detail?.provider
          ? `${detail.provider} did not sync. Check Connections.`
          : "A tracker did not sync. Check Connections.",
        path: "/you#connections",
      };
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}
