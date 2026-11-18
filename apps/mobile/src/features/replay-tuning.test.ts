import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("react-native", () => ({ View: "View", StyleSheet: { create: (value: unknown) => value } }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("expo-router", () => ({ useRouter: () => ({ canGoBack: () => false, replace: mock.replace }) }));
vi.mock("../lib/onboarding-course", () => ({ prefetchOnboardingCourseFromApi: async () => null }));
vi.mock("../ui/screen-header", () => ({ ScreenHeader: "Header" }));
vi.mock("../ui/focus", () => ({ FocusSegments: "Segments" }));
vi.mock("./onboarding-overtake", () => ({ OnboardingOvertake: "Replay" }));
import ReplayTuning from "../../app/replay-tuning";
it("replays the real presentation with adjustable duration, slowdown and camera", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let tree!: ReturnType<typeof create>;
  try {
    await act(async () => { tree = create(createElement(ReplayTuning)); });
    const replay = () => tree.root.findByType("Replay" as never);
    expect(replay().props.replayTuning).toEqual({ durationMs: 8000, slowdownWeight: 6, zoomBoost: .6 });
    for (const [label, value] of [["Replay duration", "6500"], ["Pass slowdown", "3"], ["Camera closeness", "1"]]) {
      await act(async () => tree.root.findByProps({ label }).props.onChange(value));
    }
    expect(replay().props.replayTuning).toEqual({ durationMs: 6500, slowdownWeight: 3, zoomBoost: 1 });
    await act(async () => replay().props.onComplete());
    expect(mock.replace).toHaveBeenCalledWith("/welcome");
  } finally { if (tree) await act(async () => tree.unmount()); vi.unstubAllGlobals(); }
});
