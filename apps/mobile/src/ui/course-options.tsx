import { MapHudBackdrop, useMapHud } from "./map-hud";
import { SettingsToggleRow } from "./settings-toggle-row";
import { AppIcon, type AppIconName } from "./app-icon";
import { useAppTheme } from "../appearance";
import { useThemeColors } from "../theme";
import type { ReactNode } from "react";
import { useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { textStyle } from "./section";
import { playCue } from "../lib/haptics";

export function LayersMenu({
  label,
  closeLabel,
  estimatedHeight,
  minWidth = 220,
  buttonBackgroundColor,
  buttonBorderColor,
  iconColor,
  icon = "layers",
  children,
}: {
  label: string;
  closeLabel: string;
  estimatedHeight: number;
  minWidth?: number;
  buttonBackgroundColor?: string;
  buttonBorderColor?: string;
  iconColor?: string;
  icon?: AppIconName;
  children: (ctx: { close: () => void; runAfterDismiss: (action: () => void) => void }) => ReactNode;
}) {
  const hud = useMapHud();
  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({ minWidth, estimatedHeight });
  const pendingAction = useRef<(() => void) | null>(null);
  const finishPendingAction = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  };
  const runAfterDismiss = (action: () => void) => {
    if (Platform.OS === "ios") pendingAction.current = action;
    else action();
  };

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPress={toggle}
        style={({ pressed }) => [{
          minHeight: 44,
          minWidth: 44,
          alignItems: "center",
          paddingHorizontal: 0,
          justifyContent: "center",
          borderRadius: 999,
          backgroundColor: buttonBackgroundColor ?? hud.chrome?.backgroundColor ?? "rgba(20, 20, 19, 0.72)",
          borderWidth: 1,
          borderColor: buttonBorderColor ?? hud.chrome?.borderColor ?? "rgba(255, 255, 255, 0.2)",
        }, pressed && { opacity: 0.75 }]}
      >
        {buttonBackgroundColor === undefined && <MapHudBackdrop radius={22} />}
        <AppIcon name={icon} size={22} color={iconColor ?? hud.ink} />
      </Pressable>
      <AnchoredMenu
        open={open}
        onClose={close}
        onDismiss={finishPendingAction}
        style={{ width: menuLayout?.width ?? minWidth }}
        menuLayout={menuLayout}
        accessibilityLabel={closeLabel}
      >
        {children({ close, runAfterDismiss })}
      </AnchoredMenu>
    </View>
  );
}

export function GraphOptions({
  eventView = false,
  onToggleEventView,
}: {
  eventView?: boolean;
  onToggleEventView?: () => void;
} = {}) {
  const { mode, colors: c, setPreference } = useAppTheme();
  return (
    <LayersMenu
      label="Graph options"
      closeLabel="Close graph options"
      estimatedHeight={onToggleEventView ? 104 : 56}
      minWidth={200}
      buttonBackgroundColor={c.card}
      buttonBorderColor={c.line}
      iconColor={c.ink}
    >
      {() => (
        <>
          {onToggleEventView && (
            <SettingsToggleRow
              label="Event view"
              value={eventView}
              onChange={() => {
                void playCue("selection");
                onToggleEventView();
              }}
            />
          )}
          <SettingsToggleRow
            label="Dark mode"
            value={mode === "dark"}
            onChange={() => {
              void playCue("selection");
              setPreference(mode === "dark" ? "light" : "dark");
            }}
          />
        </>
      )}
    </LayersMenu>
  );
}

export function CourseOptions({ flat, sharedLane, onToggleDimension, onToggleSpacing, onOverview, onChoose2D, onChoose3D }: {
  onReplay?: () => void;
  onChoose2D?: () => void;
  onChoose3D?: () => void;
  flat: boolean;
  sharedLane: boolean;
  onToggleDimension(): void;
  onToggleSpacing(): void;
  onOverview(): void;
}) {
  const c = useThemeColors();
  const is2D = Boolean(onChoose3D);
  return (
    <LayersMenu
      label="Course options"
      closeLabel="Close course options"
      estimatedHeight={is2D ? 56 : 164 + (onChoose2D ? 44 : 0)}
    >
      {({ close, runAfterDismiss }) => {
        const options = is2D
          ? [{ label: "3D view", value: false, action: () => { runAfterDismiss(onChoose3D!); close(); } }]
          : [
              ...(onChoose2D ? [{ label: "3D view", value: true, action: () => { runAfterDismiss(onChoose2D); close(); } }] : []),
              { label: "Perspective view", value: !flat, action: onToggleDimension },
              { label: "Shared lane", value: sharedLane, action: onToggleSpacing },
              { label: "See overview", action: onOverview },
            ];
        return options.map((option) =>
          "value" in option ? (
            <SettingsToggleRow
              key={option.label}
              label={option.label}
              value={Boolean(option.value)}
              onChange={() => {
                void playCue("selection");
                option.action();
              }}
            />
          ) : (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => {
                void playCue("selection");
                close();
                option.action();
              }}
              style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ ...textStyle("caption"), color: c.ink }}>{option.label}</Text>
            </Pressable>
          ),
        );
      }}
    </LayersMenu>
  );
}
