import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { type ComponentRef, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { textStyle } from "./section";

export interface AnchoredMenuLayout {
  x: number;
  y: number;
  width: number;
}

export function useAnchoredMenu(options?: {
  minWidth?: number;
  estimatedHeight?: number;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<ComponentRef<typeof View>>(null);
  const [menuLayout, setMenuLayout] = useState<AnchoredMenuLayout | null>(null);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const minWidth = options?.minWidth ?? 180;
    const estHeight = options?.estimatedHeight ?? 240;
    if (anchorRef.current?.measureInWindow) {
      anchorRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          const windowWidth = Dimensions.get("window").width || 375;
          const windowHeight = Dimensions.get("window").height || 812;
          const menuWidth = Math.max(width, minWidth);
          const clampedX = Math.max(16, Math.min(x, windowWidth - menuWidth - 16));
          const posY =
            y + height + 4 + estHeight > windowHeight && y > estHeight + 20
              ? y - estHeight - 4
              : y + height + 4;
          setMenuLayout({ x: clampedX, y: Math.max(54, posY), width: menuWidth });
          setOpen(true);
        },
      );
    } else {
      setMenuLayout({ x: 16, y: 50, width: minWidth });
      setOpen(true);
    }
  };

  const close = () => setOpen(false);

  return { open, close, toggle, anchorRef, menuLayout };
}

export function AnchoredMenu({
  open,
  onClose,
  onDismiss,
  menuLayout,
  accessibilityLabel = "Close menu",
  style,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  menuLayout: AnchoredMenuLayout | null;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
const s=useThemedStyles(sThemes);
  const wasOpen = useRef(open);
  useEffect(() => {
    const closing = wasOpen.current && !open;
    wasOpen.current = open;
    if (!closing || Platform.OS === "ios" || !onDismiss) return;
    const id = setTimeout(onDismiss, 0);
    return () => clearTimeout(id);
  }, [open, onDismiss]);

  // Keep iOS Modal mounted through dismissal when a caller needs its native completion.
  if (!open && !(onDismiss && Platform.OS === "ios")) return null;
  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onClose}
      >
        <View style={[StyleSheet.absoluteFill, s.backdrop]} />
      </Pressable>
      <View
        style={[
          s.dropdown,
          menuLayout
            ? {
                position: "absolute",
                top: menuLayout.y,
                left: menuLayout.x,
                minWidth: menuLayout.width,
              }
            : null,
          style,
        ]}
      >
        {children}
      </View>
    </Modal>
  );
}

export function AnchoredMenuItem({
  label,
  selected = false,
  destructive = false,
  disabled = false,
  last = false,
  left,
  onPress,
}: {
  label: string;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  last?: boolean;
  left?: ReactNode;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.item,
        selected && s.itemSelected,
        pressed && s.itemPressed,
        last && s.itemLast,
        disabled && { opacity: 0.45 },
      ]}
    >
      <View style={s.itemLeft}>
        {left}
        <Text
          numberOfLines={1}
          style={[
            textStyle(selected ? "label" : "body"),
            destructive ? { color: c.statusError } : null,
          ]}
        >
          {label}
        </Text>
      </View>
      {selected ? (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path d="M5 13l4 4L19 7" stroke={c.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </Pressable>
  );
}

const sThemes = createThemedStyles(themeColors=>{return {
  backdrop: {
    backgroundColor: "rgba(10, 15, 20, 0.2)",
  },
  dropdown: {
    backgroundColor: `${themeColors.card}f0`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.65)",
    overflow: "hidden",
    shadowColor: themeColors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 9999,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: themeColors.line,
  },
  itemSelected: {
    backgroundColor: themeColors.actionSoft,
  },
  itemPressed: {
    backgroundColor: themeColors.soft,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
};});
