import { createElement, type ReactNode } from "react";

/** RN Web's role mapping turns G + button into an HTML button, invalid inside SVG. */
export function LaneRacerTarget({ children, onPress, accessibilityLabel, accessibilityState }: {
  children?: ReactNode; onPress?: () => void; accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean }; accessible?: boolean; accessibilityRole?: string;
}) {
  return createElement("g", {
    role: "button", tabIndex: 0, "aria-label": accessibilityLabel, "aria-pressed": accessibilityState?.selected,
    onClick: onPress,
    onKeyDown: event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPress?.(); } },
  }, children);
}
