import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultNotificationPreferences,
  defaultNotificationPromptState,
  recordNotificationMaybeLater,
  getAppColors,
} from "@fitness-battle/shared";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mock = vi.hoisted(() => ({
  prefs: null as ReturnType<typeof defaultNotificationPreferences> | null,
  promptState: null as ReturnType<typeof defaultNotificationPromptState> | null,
  enableNativePush: vi.fn(),
  dismissNotificationOptIn: vi.fn(),
  playCue: vi.fn(),
}));

vi.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  StyleSheet: { create: (value: unknown) => value },
}));
vi.mock("../theme", () => ({ useThemeColors: () => getAppColors("light") }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("../ui/section", () => ({
  AppText: ({ children, ...props }: { children: ReactNode }) =>
    createElement("AppText", props, children),
}));
vi.mock("../lib/haptics", () => ({ playCue: mock.playCue }));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-1", mode: "supabase" },
    accessToken: "tok-1",
  }),
}));
vi.mock("../lib/push-notifications", () => ({
  hydrateNotificationPreferences: () => Promise.resolve(mock.prefs!),
  loadNotificationPromptState: () => Promise.resolve(mock.promptState!),
  enableNativePush: mock.enableNativePush,
  dismissNotificationOptIn: mock.dismissNotificationOptIn,
}));

import { NotificationOptInStrip } from "./notification-opt-in";

describe("NotificationOptInStrip", () => {
  beforeEach(() => {
    const now = new Date("2026-11-23T12:00:00Z");
    mock.prefs = defaultNotificationPreferences(now);
    mock.promptState = defaultNotificationPromptState();
    mock.enableNativePush.mockReset();
    mock.dismissNotificationOptIn.mockReset();
    mock.playCue.mockReset();
  });

  it("enables push with rival_moves when the overtake CTA is pressed", async () => {
    const granted = {
      ...mock.prefs!,
      enabled: true,
      permissionStatus: "granted" as const,
    };
    mock.enableNativePush.mockResolvedValue({ prefs: granted, mode: "expo" });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(NotificationOptInStrip, {
          surface: "competition_moment",
          hasOvertake: true,
        }),
      );
    });

    const buttons = renderer.root.findAllByType("Pressable" as never);
    expect(buttons).toHaveLength(2);
    expect(buttons[0].props.accessibilityLabel).toBe(
      "Notify me if I get overtaken",
    );

    await act(async () => {
      buttons[0].props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mock.enableNativePush).toHaveBeenCalledWith(
      { userId: "user-1", localOnly: false, accessToken: "tok-1" },
      "rival_moves",
    );
    expect(renderer.root.findAllByType("Pressable" as never)).toHaveLength(0);
  });

  it("records Maybe later cooldown and hides the strip when dismissed", async () => {
    mock.dismissNotificationOptIn.mockResolvedValue(
      recordNotificationMaybeLater(new Date("2026-11-23T12:00:00Z")),
    );

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(NotificationOptInStrip, {
          surface: "week_recap",
          variant: "recap",
        }),
      );
    });

    const buttons = renderer.root.findAllByType("Pressable" as never);
    expect(buttons[0].props.accessibilityLabel).toBe(
      "Notify me when the week settles",
    );
    expect(buttons[1].props.accessibilityLabel).toBe("Maybe later");

    await act(async () => {
      buttons[1].props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mock.dismissNotificationOptIn).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType("Pressable" as never)).toHaveLength(0);
  });

  it("always shows in debug preview mode and dismisses locally without persisting cooldown", async () => {
    mock.prefs = {
      ...mock.prefs!,
      enabled: true,
      permissionStatus: "granted",
    };

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(NotificationOptInStrip, {
          surface: "competition_moment",
          hasOvertake: true,
          debug: true,
        }),
      );
    });

    const buttons = renderer.root.findAllByType("Pressable" as never);
    expect(buttons).toHaveLength(2);

    await act(async () => {
      buttons[1].props.onPress();
      await Promise.resolve();
    });

    expect(mock.dismissNotificationOptIn).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType("Pressable" as never)).toHaveLength(0);
  });
});
