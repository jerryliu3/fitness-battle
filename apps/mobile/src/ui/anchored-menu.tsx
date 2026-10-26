import { type ComponentRef, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SHELL_COLORS as c } from "../theme";

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
          setMenuLayout({ x: clampedX, y: Math.max(16, posY), width: menuWidth });
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
  menuLayout,
  accessibilityLabel = "Close menu",
  style,
  children,
}: {
  open: boolean;
  onClose: () => void;
  menuLayout: AnchoredMenuLayout | null;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onClose}
      >
        <View style={StyleSheet.absoluteFill} />
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

const s = StyleSheet.create({
  dropdown: {
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    overflow: "hidden",
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
});
