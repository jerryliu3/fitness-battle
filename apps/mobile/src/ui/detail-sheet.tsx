import { textStyle } from "./section";
import { BottomSheet } from "heroui-native/bottom-sheet";
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";

export function DetailSheet({
  open,
  title,
  body,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return (
    <BottomSheet
      isOpen={open}
      animation={reduceMotion ? "disable-all" : undefined}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={["42%"]}>
          <View style={styles.stack}>
            <BottomSheet.Title style={textStyle("pageTitle")}>{title}</BottomSheet.Title>
            <BottomSheet.Description style={textStyle("body")}>{body}</BottomSheet.Description>
            {children}
            <BottomSheet.Close />
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12, paddingBottom: 12 },
});
