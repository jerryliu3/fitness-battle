import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  replace: vi.fn(), storage: new Map<string, string>(), signUp: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("next=%2Fapp%2Farena%3Finvite%3Dcrew"), useRouter: () => ({ replace: mock.replace }) }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => ({ user: mock.user, loading: false, signUp: mock.signUp }) }));
vi.mock("@/ui/section", () => ({ AppHeading: "h1", AppParagraph: "p" }));
import Signup from "@/app/(auth)/signup/page";
beforeEach(() => {
  vi.clearAllMocks(); mock.user = null; mock.storage.clear();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("localStorage", { getItem: (key: string) => mock.storage.get(key) ?? null, setItem: (key: string, value: string) => mock.storage.set(key, value) });
});
it("redirects once when signup immediately creates a session, preserving the invitation", async () => {
  mock.signUp.mockImplementation(async () => { mock.user = { id: "new", email: "taylor@example.com" }; return {}; });
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(createElement(Signup)); });
  await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
  expect(mock.replace).toHaveBeenCalledTimes(1);
  expect(mock.replace).toHaveBeenCalledWith("/app/welcome?next=%2Fapp%2Farena%3Finvite%3Dcrew");
  await act(async () => renderer.unmount());
});
it("resolves an existing session through setup while preserving its destination", async () => {
  mock.user = { id: "existing", email: "owner@example.com" };
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(createElement(Signup)); });
  expect(mock.replace).toHaveBeenCalledWith("/app/onboarding?next=%2Fapp%2Farena%3Finvite%3Dcrew");
  expect(mock.signUp).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});
