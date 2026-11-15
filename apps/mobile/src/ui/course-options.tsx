import { SettingsToggleRow } from "./settings-toggle-row";
import { AppIcon } from "./app-icon";
import { useAppTheme } from "../appearance";
import { useThemeColors } from "../theme";
import type { ReactNode } from "react";
import { useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { textStyle } from "./section";
import { playCue } from "../lib/haptics";

function LayersMenu({
  label,
  closeLabel,
  estimatedHeight,
  minWidth = 220,
  buttonBackgroundColor = "rgba(20, 20, 19, 0.72)",
  buttonBorderColor = "rgba(255, 255, 255, 0.2)",
  iconColor = "#ffffff",
  children,
}: {
  label: string;
  closeLabel: string;
  estimatedHeight: number;
  minWidth?: number;
  buttonBackgroundColor?: string;
  buttonBorderColor?: string;
  iconColor?: string;
  children: (ctx: { close: () => void; runAfterDismiss: (action: () => void) => void }) => ReactNode;
}) {
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
          backgroundColor: buttonBackgroundColor,
          borderWidth: 1,
          borderColor: buttonBorderColor,
        }, pressed && { opacity: 0.75 }]}
      >
        <AppIcon name="layers" size={22} color={iconColor} />
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

export function GraphOptions() {
  const { mode, colors: c, setPreference } = useAppTheme();
  return (
    <LayersMenu
      label="Graph options"
      closeLabel="Close graph options"
      estimatedHeight={56}
      minWidth={200}
      buttonBackgroundColor={c.card}
      buttonBorderColor={c.line}
      iconColor={c.ink}
    >
      {() => (
        <SettingsToggleRow
          label="Dark mode"
          value={mode === "dark"}
          onChange={() => {
            void playCue("selection");
            setPreference(mode === "dark" ? "light" : "dark");
          }}
        />
      )}
    </LayersMenu>
  );
}

export function CourseOptions({ flat, spaced, onToggleDimension, onToggleSpacing, onOverview, onReplay, onChoose2D }: {
  onReplay?: () => void;
  onChoose2D?: () => void;
  flat: boolean;
  spaced: boolean;
  onToggleDimension(): void;
  onToggleSpacing(): void;
  onOverview(): void;
}) {
  const c = useThemeColors();
  return (
    <LayersMenu
      label="Course options"
      closeLabel="Close course options"
      estimatedHeight={164 + (onReplay ? 44 : 0) + (onChoose2D ? 44 : 0)}
    >
      {({ close, runAfterDismiss }) => {
        const options = [
          ...(onChoose2D ? [{ label: "3D view", value: true, action: () => { runAfterDismiss(onChoose2D); close(); } }] : []),
          { label: "Perspective view", value: !flat, action: onToggleDimension },
          { label: "Shared lane", value: !spaced, action: onToggleSpacing },
          ...(onReplay ? [{ label: "View replay", action: () => runAfterDismiss(onReplay) }] : []),
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
