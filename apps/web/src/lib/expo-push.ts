import {
  buildExpoPushMessage,
  type ExpoPushMessage,
  type NotificationDeliveryPayload,
} from "@fitness-battle/shared";
import { serverEnv } from "@/lib/env";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

export type ExpoSendResult = {
  attempted: number;
  tickets: ExpoPushTicket[];
  okCount: number;
  errorCount: number;
};

function pushHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };
  if (serverEnv.expoAccessToken) {
    headers.Authorization = `Bearer ${serverEnv.expoAccessToken}`;
  }
  return headers;
}

export function messagesForTokens(
  tokens: string[],
  payload: NotificationDeliveryPayload,
): ExpoPushMessage[] {
  const messages: ExpoPushMessage[] = [];
  for (const token of tokens) {
    const message = buildExpoPushMessage(token, payload);
    if (message) messages.push(message);
  }
  return messages;
}

/** Send via Expo Push Service. Empty token list is a no-op success. */
export async function sendExpoPush(
  tokens: string[],
  payload: NotificationDeliveryPayload,
): Promise<ExpoSendResult> {
  const messages = messagesForTokens(tokens, payload);
  if (messages.length === 0) {
    return { attempted: 0, tickets: [], okCount: 0, errorCount: 0 };
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: pushHeaders(),
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `expo_push_http_${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }

  const body = (await response.json()) as {
    data?: ExpoPushTicket[];
    errors?: Array<{ message?: string }>;
  };

  if (body.errors?.length) {
    throw new Error(body.errors.map((item) => item.message).filter(Boolean).join("; ") || "expo_push_error");
  }

  const tickets = body.data ?? [];
  const okCount = tickets.filter((ticket) => ticket.status === "ok").length;
  const errorCount = tickets.length - okCount;
  return {
    attempted: messages.length,
    tickets,
    okCount,
    errorCount,
  };
}

export function expoPushConfigured(): boolean {
  // Expo Push HTTP API works without an access token for many projects;
  // the optional token raises rate limits / project attribution.
  return true;
}
