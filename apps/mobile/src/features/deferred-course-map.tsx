import type { ComponentProps } from "react";
import { NativeModules, View } from "react-native";
import { AppText } from "../ui/section";
import { useThemeColors } from "../theme";

export const nativeCourseMapAvailable = Boolean(NativeModules.RNMBXModule);

// Evaluate the native SDK inside MapBoundary, and include it in the main Metro
// graph. A separate async dev chunk can leave its transitive modules undefined.
export function DeferredCourseMap(props: ComponentProps<typeof import("../ui/course-map").default>) {
  const c = useThemeColors();
  if (!nativeCourseMapAvailable) return <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: c.paper }}><AppText>This app build is missing native map support. Install the latest build.</AppText></View>;
  const NativeMap = require("../ui/course-map").default as typeof import("../ui/course-map").default;
  return <NativeMap {...props} />;
}

export function forgetCourseCameras() {
  if (nativeCourseMapAvailable) (require("../ui/course-map") as typeof import("../ui/course-map")).forgetCourseCameras();
}
