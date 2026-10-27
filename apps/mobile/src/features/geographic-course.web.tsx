import { Linking, Pressable, Text } from "react-native";
import { mobileEnv } from "../lib/env";
import { textStyle } from "../ui/section";
import type { GeographicCourse as NativeCourse } from "./geographic-course";

/** Expo static web does not bundle the native SDK; Next owns browser maps. */
export function GeographicCourse({ unit }: Parameters<typeof NativeCourse>[0]) {
  if (unit !== "km" && unit !== "mi") return null;
  return <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(`${mobileEnv.apiUrl.replace(/\/$/, "")}/app/arena`); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={textStyle("label")}>Open geographic courses in the web app</Text></Pressable>;
}
