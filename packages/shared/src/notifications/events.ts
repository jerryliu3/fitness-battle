import type {
  NotificationCategoryId,
  NotificationDeliveryPayload,
} from "./types";

/** Product copy for account push events. */
export function notificationEvent(
  category: NotificationCategoryId,
  detail?: {
    place?: number;
    provider?: string;
    sport?: string;
    count?: number;
    direction?: "overtaken" | "overtook";
    athleteName?: string;
    kind?: "morning" | "evening";
    sleepMin?: number;
    recoveryScore?: number;
    steps?: number;
  },
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
    case "rival_moves": {
      if (detail?.direction === "overtook") {
        const who = detail.athleteName?.trim();
        return {
          category,
          title: "You made a pass",
          body:
            who && detail?.place != null
              ? `You passed ${who} for place ${detail.place}.`
              : detail?.place != null
                ? `You moved up to place ${detail.place} on the board.`
                : who
                  ? `You passed ${who} on the board.`
                  : "You moved up on the board.",
          path: "/board",
        };
      }
      const who = detail?.athleteName?.trim();
      return {
        category,
        title: "Board moved",
        body:
          who && detail?.place != null
            ? `${who} jumped ahead — you’re now place ${detail.place}.`
            : detail?.place != null
              ? `You’re now place ${detail.place}. Someone nearby jumped ahead.`
              : "Someone nearby jumped the board.",
        path: "/board",
      };
    }
    case "activity_synced": {
      const count = detail?.count ?? 1;
      const sport = detail?.sport?.trim();
      const provider = detail?.provider?.trim();
      return {
        category,
        title: count > 1 ? `${count} activities synced` : "Activity synced",
        body:
          count > 1
            ? provider
              ? `${count} new workouts arrived from ${provider}.`
              : `${count} new workouts are on your board.`
            : sport && provider
              ? `Your ${sport} from ${provider} is on the board.`
              : sport
                ? `Your ${sport} is synced and on the board.`
                : "Your latest workout is synced and on the board.",
        path: "/today",
      };
    }
    case "daily_digest": {
      const parts: string[] = [];
      if (detail?.kind === "evening" && detail.steps != null) {
        parts.push(`${Math.round(detail.steps).toLocaleString("en-US")} steps today`);
      }
      if (detail?.sleepMin != null && detail.sleepMin > 0) {
        const hrs = Math.floor(detail.sleepMin / 60);
        const mins = Math.round(detail.sleepMin % 60);
        parts.push(`${hrs}h ${mins}m sleep`);
      }
      if (detail?.recoveryScore != null) {
        parts.push(`Recovery ${Math.round(detail.recoveryScore)}`);
      }
      return {
        category,
        title: detail?.kind === "evening" ? "Daily summary" : "Morning check-in",
        body:
          parts.length > 0
            ? `${parts.join(" · ")}.`
            : detail?.kind === "evening"
              ? "Your daily steps and wellness summary are ready."
              : "Your morning sleep and recovery check-in is ready.",
        path: "/today",
      };
    }
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
