import type { ComponentProps } from "react";
import { NativeModules, Text, View } from "react-native";
import { textStyle } from "../ui/section";

export const nativeCourseMapAvailable = Boolean(NativeModules.RNMBXModule);

// Evaluate the native SDK inside MapBoundary, and include it in the main Metro
// graph. A separate async dev chunk can leave its transitive modules undefined.
export function DeferredCourseMap(props: ComponentProps<typeof import("../ui/course-map").default>) {
  if (!nativeCourseMapAvailable) return <View style={{ flex: 1, justifyContent: "center", padding: 24 }}><Text style={{ ...textStyle("body"), color: "#ffffff" }}>This app build is missing native map support. Install the latest build.</Text></View>;
  const NativeMap = require("../ui/course-map").default as typeof import("../ui/course-map").default;
  return <NativeMap {...props} />;
}
