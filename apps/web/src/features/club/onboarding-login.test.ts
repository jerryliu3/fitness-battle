import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
import { GUEST_SIGNUP_PENDING_KEY } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({
  params: new URLSearchParams(), replace: vi.fn(), signIn: vi.fn(async (_email: string, _password: string): Promise<{ error?: string }> => ({})),
  removeItem: vi.fn(),
  user: { id: "existing" } as { id: string } | null,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => mock.params, useRouter: () => ({ replace: mock.replace }) }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => ({ user: mock.user, loading: false, signIn: mock.signIn }) }));
vi.mock("@/ui/back-button", () => ({ BackButton: "BackButton" }));
vi.mock("@/ui/section", () => ({ AppHeading: "h1", AppParagraph: "p" }));
import Login from "@/app/(auth)/login/page";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks(); vi.stubGlobal("localStorage", { removeItem: mock.removeItem }); mock.user = { id: "existing" };
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
