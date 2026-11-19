import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { GUEST_SIGNUP_PENDING_KEY } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({
  params: new URLSearchParams(), replace: vi.fn(), signIn: vi.fn(async (_email: string, _password: string): Promise<{ error?: string }> => ({})),
  signInWithGoogle: vi.fn(async (): Promise<{ error?: string }> => ({})),
  signInWithApple: vi.fn(async (): Promise<{ error?: string }> => ({})),
  offlineMode: undefined as boolean | undefined,
  removeItem: vi.fn(),
  user: { id: "existing" } as { id: string } | null,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => mock.params, useRouter: () => ({ replace: mock.replace }) }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/components/auth-context", () => ({
  useAuth: () => ({
    user: mock.user,
    loading: false,
    offlineMode: mock.offlineMode,
    signIn: mock.signIn,
    signInWithGoogle: mock.signInWithGoogle,
    signInWithApple: mock.signInWithApple,
  }),
}));
vi.mock("@/ui/back-button", () => ({ BackButton: "BackButton" }));
vi.mock("@/ui/section", () => ({ AppHeading: "h1", AppParagraph: "p" }));
import Login from "@/app/(auth)/login/page";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks(); vi.stubGlobal("localStorage", { removeItem: mock.removeItem }); mock.user = { id: "existing" };
  mock.offlineMode = undefined;
  mock.params = new URLSearchParams("from=onboarding&preview=1");
  mock.signIn.mockResolvedValue({});
});
it("waits for explicit sign-in even with an existing session and returns Back to the preview", async () => {
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Login)); });
  expect(mock.replace).not.toHaveBeenCalled();
  expect(r.root.findByType("BackButton" as never).props.href).toBe("/app/welcome?preview=1");
  await act(async () => r.root.findAllByType("input")[0].props.onChange({ target: { value: "taylor@example.com" } }));
  await act(async () => r.root.findAllByType("input")[1].props.onChange({ target: { value: "password" } }));
  await act(async () => r.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() }));
  expect(mock.removeItem).toHaveBeenCalledWith(GUEST_SIGNUP_PENDING_KEY);
  expect(mock.signIn).toHaveBeenCalledWith("taylor@example.com", "password");
  expect(mock.replace).toHaveBeenCalledTimes(1);
  expect(mock.replace).toHaveBeenCalledWith("/app/onboarding?next=%2Fapp%2Ftoday");
  await act(async () => r.unmount());
});
it("keeps failed sign-in on the form and offers the regular onboarding Back path", async () => {
  mock.params = new URLSearchParams("from=onboarding"); mock.user = null;
  mock.signIn.mockResolvedValue({ error: "Could not sign in." });
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Login)); });
  expect(r.root.findByType("BackButton" as never).props.href).toBe("/app/welcome");
  await act(async () => r.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() }));
  expect(mock.replace).not.toHaveBeenCalled();
  expect(r.root.findAllByType("p").some(n => n.props.role === "alert")).toBe(true);
  await act(async () => r.unmount());
});
it("retains automatic redirect for ordinary signed-in login visits", async () => {
  mock.params = new URLSearchParams("next=%2Fapp%2Farena");
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Login)); });
  expect(mock.replace).toHaveBeenCalledWith("/app/arena");
  await act(async () => r.unmount());
});
it("shows Apple, Google, and Email choices first in live mode and reveals email fields on Continue with Email", async () => {
  mock.user = null;
  mock.offlineMode = false;
  mock.params = new URLSearchParams("next=%2Fapp%2Ftoday");
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(Login)); });
  expect(r.root.findAllByType("input")).toHaveLength(0);
  const buttons = r.root.findAllByType("button");
  const emailBtn = buttons.find((b) =>
    b.findAllByType("span").some((s) => s.children.includes("Continue with Email")),
  )!;
  expect(emailBtn).toBeDefined();
  await act(async () => emailBtn.props.onClick());
  expect(r.root.findAllByType("input")).toHaveLength(2);
  await act(async () => r.unmount());
});
