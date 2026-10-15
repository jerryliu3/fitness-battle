import { describe, expect, it } from "vitest";
import { messagesForTokens } from "./expo-push";

describe("expo push sender helpers", () => {
  it("builds one message per live Expo token", () => {
    const messages = messagesForTokens(
      ["ExponentPushToken[a]", "stub-web-1", "ExponentPushToken[b]"],
      {
        category: "rival_moves",
        title: "Move",
        body: "Someone jumped you",
        path: "/board",
      },
    );
    expect(messages).toHaveLength(2);
    expect(messages[0]?.to).toBe("ExponentPushToken[a]");
    expect(messages[1]?.data).toEqual({
      category: "rival_moves",
      path: "/board",
    });
  });
});
