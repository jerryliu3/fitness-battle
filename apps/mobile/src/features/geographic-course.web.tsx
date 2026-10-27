import { useEffect } from "react";
import { Linking, Pressable, Text } from "react-native";
import { mobileEnv } from "../lib/env";
import { textStyle } from "../ui/section";
import type { GeographicCourse as NativeCourse } from "./geographic-course";

/** Expo's static web preview does not bundle the native Mapbox SDK. Next owns web maps. */
export function GeographicCourse({ unit, open, onClose }: Parameters<typeof NativeCourse>[0]) {
  useEffect(() => {
    if (open) void Linking.openURL(`${mobileEnv.apiUrl.replace(/\/$/, "")}/app/arena`).then(onClose).catch(() => {});
  }, [open]);
  if (!open) return null;
  if (unit !== "km" && unit !== "mi") return null;
  return <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(`${mobileEnv.apiUrl.replace(/\/$/, "")}/app/arena`); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={textStyle("label")}>Open geographic courses in the web app</Text></Pressable>;
}
