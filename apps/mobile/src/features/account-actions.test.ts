import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  user: {
    id: "user-1",
    email: "athlete@example.com",
    displayName: "Athlete",
    mode: "supabase" as "supabase" | "demo",
  } as {
    id: string;
    email: string;
    displayName: string;
    mode: "supabase" | "demo";
  } | null,
  offlineMode: false,
  changePassword: vi.fn(
    async (
      _current: string,
      _next: string,
      _confirm: string,
    ): Promise<{ error?: string }> => ({}),
  ),
  signOut: vi.fn(async () => {}),
  clearAccountData: vi.fn(async () => true),
  playCue: vi.fn(),
}));

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));
vi.mock("../theme", () => ({
  useThemeColors: () => ({ muted: "#666", statusError: "#b83a38" }),
}));
vi.mock("../lib/haptics", () => ({ playCue: mock.playCue }));
vi.mock("../lib/api", () => ({ requestApi: vi.fn() }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://test.local" } }));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: mock.user,
    offlineMode: mock.offlineMode,
    accessToken: "token",
    signOut: mock.signOut,
    changePassword: mock.changePassword,
  }),
}));
vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({ clearAccountData: mock.clearAccountData }),
}));
vi.mock("../ui/section", () => ({ AppText: "AppText" }));
vi.mock("../ui/focus", () => ({
  useFocusStyles: () => ({
    button: {},
    secondary: {},
    buttonText: {},
    input: {},
  }),
  FocusButton: "FocusButton",
  FocusSheet: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children?: ReactNode;
  }) => (open ? createElement("FocusSheet", { title }, children) : null),
}));

import { AccountActions } from "./account-actions";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  mock.user = {
    id: "user-1",
    email: "athlete@example.com",
    displayName: "Athlete",
    mode: "supabase",
  };
  mock.offlineMode = false;
  mock.changePassword.mockResolvedValue({});
});

describe("AccountActions password reset", () => {
  it("opens the Reset password sheet, validates mismatch, and updates password", async () => {
    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(createElement(AccountActions, { showDeleteButton: false }));
    });

    const resetBtn = r.root
      .findAllByType("FocusButton" as never)
      .find((n) => n.props.label === "Reset password")!;
    await act(async () => {
      resetBtn.props.onPress();
    });

    const sheet = r.root.findByType("FocusSheet" as never);
    expect(sheet.props.title).toBe("Reset password");

    const inputs = () => r.root.findAllByType("TextInput" as never);
    expect(inputs()).toHaveLength(3);

    await act(async () => {
      inputs()[0].props.onChangeText("old-pass");
      inputs()[1].props.onChangeText("new-pass");
      inputs()[2].props.onChangeText("mismatch");
    });

    const submitBtn = () =>
      r.root
        .findAllByType("FocusButton" as never)
        .find((n) => n.props.label === "Update password")!;
    await act(async () => {
      submitBtn().props.onPress();
    });

    expect(mock.changePassword).not.toHaveBeenCalled();
    expect(
      r.root
        .findAllByType("AppText" as never)
        .some((n) => n.props.children === "New passwords do not match."),
    ).toBe(true);

    await act(async () => {
      inputs()[2].props.onChangeText("new-pass");
    });
    await act(async () => {
      submitBtn().props.onPress();
    });

    expect(mock.changePassword).toHaveBeenCalledWith(
      "old-pass",
      "new-pass",
      "new-pass",
    );
    expect(
      r.root
        .findAllByType("AppText" as never)
        .some(
          (n) =>
            n.props.children ===
            "Password updated. Use your new password the next time you sign in.",
        ),
    ).toBe(true);
    expect(mock.playCue).toHaveBeenCalledWith("success");

    await act(async () => r.unmount());
  });

  it("shows unavailable message in demo/offline mode", async () => {
    mock.user = {
      id: "demo-1",
      email: "demo@example.com",
      displayName: "Demo",
      mode: "demo",
    };

    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(createElement(AccountActions, { showDeleteButton: false }));
    });

    const resetBtn = r.root
      .findAllByType("FocusButton" as never)
      .find((n) => n.props.label === "Reset password")!;
    await act(async () => {
      resetBtn.props.onPress();
    });

    expect(r.root.findAllByType("TextInput" as never)).toHaveLength(0);
    expect(
      r.root
        .findAllByType("AppText" as never)
        .some(
          (n) =>
            n.props.children ===
            "Sign in with a live account to reset your password.",
        ),
    ).toBe(true);

    await act(async () => r.unmount());
  });
});
