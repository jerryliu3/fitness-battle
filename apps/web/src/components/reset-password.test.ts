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
  playCue: vi.fn(),
}));

vi.mock("@/components/auth-context", () => ({
  useAuth: () => ({
    user: mock.user,
    offlineMode: mock.offlineMode,
    changePassword: mock.changePassword,
  }),
}));
vi.mock("@/lib/haptics", () => ({ playCue: mock.playCue }));
vi.mock("@/ui/section", () => ({ AppParagraph: "p" }));
vi.mock("@/ui/sheet", () => ({
  Sheet: ({
    open,
    title,
    body,
    children,
  }: {
    open: boolean;
    title: string;
    body: string;
    children?: ReactNode;
  }) =>
    open
      ? createElement(
          "div",
          { "data-sheet": title },
          createElement("p", null, body),
          children,
        )
      : null,
}));

import { ResetPassword } from "./reset-password";

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

describe("ResetPassword", () => {
  it("opens the sheet, validates mismatches before submitting, and resets to success on valid submit", async () => {
    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(createElement(ResetPassword));
    });

    const trigger = r.root.findByType("button");
    expect(trigger.props.children).toBe("Reset password");
    await act(async () => {
      trigger.props.onClick();
    });

    const inputs = () => r.root.findAllByType("input");
    expect(inputs()).toHaveLength(3);

    await act(async () => {
      inputs()[0].props.onChange({ target: { value: "old-pass" } });
      inputs()[1].props.onChange({ target: { value: "new-pass" } });
      inputs()[2].props.onChange({ target: { value: "mismatch" } });
    });

    await act(async () => {
      r.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() });
    });
    expect(mock.changePassword).not.toHaveBeenCalled();
    expect(
      r.root.findAllByType("p").some((n) => n.props.role === "alert" && n.props.children === "New passwords do not match."),
    ).toBe(true);

    await act(async () => {
      inputs()[2].props.onChange({ target: { value: "new-pass" } });
    });
    await act(async () => {
      r.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() });
    });

    expect(mock.changePassword).toHaveBeenCalledWith(
      "old-pass",
      "new-pass",
      "new-pass",
    );
    expect(
      r.root.findAllByType("p").some((n) => n.props.role === "status"),
    ).toBe(true);
    expect(mock.playCue).toHaveBeenCalledWith("success");

    await act(async () => r.unmount());
  });

  it("shows an error alert when password update fails", async () => {
    mock.changePassword.mockResolvedValue({
      error: "Current password is incorrect.",
    });

    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(createElement(ResetPassword));
    });
    await act(async () => {
      r.root.findByType("button").props.onClick();
    });

    const inputs = r.root.findAllByType("input");
    await act(async () => {
      inputs[0].props.onChange({ target: { value: "wrong-pass" } });
      inputs[1].props.onChange({ target: { value: "new-pass" } });
      inputs[2].props.onChange({ target: { value: "new-pass" } });
    });
    await act(async () => {
      r.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() });
    });

    expect(
      r.root.findAllByType("p").some(
        (n) =>
          n.props.role === "alert" &&
          n.props.children === "Current password is incorrect.",
      ),
    ).toBe(true);
    expect(mock.playCue).toHaveBeenCalledWith("error");

    await act(async () => r.unmount());
  });

  it("shows live-account notice instead of form in offline or demo mode", async () => {
    mock.offlineMode = true;

    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(createElement(ResetPassword));
    });
    await act(async () => {
      r.root.findByType("button").props.onClick();
    });

    expect(r.root.findAllByType("input")).toHaveLength(0);
    expect(
      r.root.findAllByType("p").some(
        (n) =>
          n.props.children === "Sign in with a live account to reset your password.",
      ),
    ).toBe(true);

    await act(async () => r.unmount());
  });
});
