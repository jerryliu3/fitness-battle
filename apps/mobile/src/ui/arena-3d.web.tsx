import { useThemeColors } from "../theme";
import { SHELL_COLORS as clubColors } from "@fitness-battle/shared";
import { createElement } from "react";
import { resolveArenaSelectedId } from "@fitness-battle/shared";
import {
  LivePursuit,
  defaultLook,
  type SceneRunner,
} from "@fitness-battle/pursuit";
import type { Arena3DProps } from "./arena-3d";

/**
 * Expo web runs the Three.js pursuit in-process (same as Next Arena).
 * Only native uses a WebView → /arena-scene bridge.
 */
export function Arena3D({
  model,
  onSelect,
  onPan,
  onUnavailable,
}: Arena3DProps) {
  const clubColors = useThemeColors();

  const runners: SceneRunner[] = model.lanes
    .filter((lane) => !lane.ghost)
    .map((lane) => ({
      id: lane.id,
      name: lane.name,
      avatarUrl: lane.avatarUrl,
      initials: lane.initials,
      series: [0, lane.value],
      you: lane.you,
    }));
  const ghostLane = model.lanes.find((item) => item.ghost);
  const ghost: SceneRunner | null = ghostLane
    ? {
        id: ghostLane.id,
        name: ghostLane.name,
        initials: ghostLane.initials,
        series: [0, ghostLane.value],
        ghost: true,
      }
    : null;
  const selected = resolveArenaSelectedId(model.selected, [
    ...runners,
    ...(ghost ? [ghost] : []),
  ]);

  return createElement(
    "div",
    {
      className: "fb-arena-3d",
      style: {
        height: 520,
        width: "100%",
        borderRadius: 20,
        overflow: "hidden",
        background: clubColors.soft,
        position: "relative" as const,
      },
    },
    createElement(
      "style",
      null,
      `.fb-arena-3d .fd-live-world{height:520px;min-height:520px}.fb-arena-3d .fd-world-label{background:#fffffff0;color:#282f2c;border:1px solid #e0e5dc;border-radius:10px}.fb-arena-3d canvas{touch-action:none;height:520px!important}`,
    ),
    createElement(LivePursuit, {
      runners,
      ghost,
      time: 1,
      extra: 0,
      selected,
      showGhost: true,
      camera: "follow" as const,
      look: defaultLook,
      unit: model.unit,
      view: model.view,
      onPan,
      onSelect,
      onUnavailable,
    }),
  );
}
