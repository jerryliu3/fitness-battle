import { isExpoPushToken } from "./prefs";
import type { NotificationDeliveryPayload, PushRegistration } from "./types";

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  channelId?: string;
}

export function buildExpoPushMessage(
  token: string,
  payload: NotificationDeliveryPayload,
): ExpoPushMessage | null {
  if (!isExpoPushToken(token)) return null;
  return {
    to: token,
    title: payload.title,
    body: payload.body,
    sound: "default",
    channelId: "default",
    data: {
      category: payload.category,
      ...(payload.path ? { path: payload.path } : {}),
    },
  };
}

export function liveExpoTokensFromRegistrations(
  registrations: Array<Pick<PushRegistration, "token" | "stub"> | null | undefined>,
): string[] {
  const tokens = new Set<string>();
  for (const row of registrations) {
    if (!row?.token || row.stub) continue;
    if (isExpoPushToken(row.token)) tokens.add(row.token);
  }
  return [...tokens];
}
