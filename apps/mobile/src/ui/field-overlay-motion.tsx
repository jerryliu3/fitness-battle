import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { G, type GProps } from "react-native-svg";
import { useReducedMotion } from "./use-reduced-motion";

const AnimatedGroup = Animated.createAnimatedComponent(G);

function useOverlayOpacity(hidden: boolean, nativeDriver: boolean) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(hidden ? 0 : 1)).current;
  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: hidden ? 0 : 1,
      duration: reduced ? 0 : 160,
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [hidden, reduced, nativeDriver, value]);
  return value;
}

export function FieldOverlayView({ hidden, style, ...props }: Animated.AnimatedProps<ViewProps> & { hidden: boolean }) {
  const opacity = useOverlayOpacity(hidden, true);
  return <Animated.View {...props} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"} pointerEvents={hidden ? "none" : props.pointerEvents} style={[style, { opacity }]} />;
}

export function FieldOverlayGroup({ hidden, ...props }: GProps & { hidden: boolean }) {
  const opacity = useOverlayOpacity(hidden, false);
  return <AnimatedGroup {...props} opacity={opacity} />;
}

export function SlidingFieldPanel({ label, collapsed, onToggle, overlaysHidden, style, children }: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  overlaysHidden: boolean;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const panelStyle = StyleSheet.flatten(style);
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const travel = useRef(new Animated.Value(collapsed ? -10000 : 0)).current;
  const measured = useRef(false);
  useEffect(() => {
    if (!width) return;
    const duration = reduced || !measured.current ? 0 : 320;
    measured.current = true;
    const animation = Animated.timing(travel, {
      toValue: collapsed ? -width + 44 - 12 : 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [collapsed, width, reduced, travel]);
  return (
    <FieldOverlayView hidden={overlaysHidden} pointerEvents="box-none" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[style, { paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, backgroundColor: "transparent", marginRight: -44, maxWidth: typeof panelStyle?.maxWidth === "number" ? panelStyle.maxWidth + 44 : undefined, transform: [{ translateX: travel }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${label}`}
        accessibilityState={{ expanded: !collapsed }}
        onPress={onToggle}
        style={{ position: "absolute", right: 0, top: "50%", marginTop: -32, width: 44, height: 64, justifyContent: "center", zIndex: 1 }}
      >
        <View pointerEvents="none" style={{ width: 18, height: 52, borderTopRightRadius: 10, borderBottomRightRadius: 10, backgroundColor: "rgba(20,20,19,.78)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: "rgba(255,255,255,.7)" }} />
        </View>
      </Pressable>
      <View pointerEvents={collapsed ? "none" : "auto"} accessibilityElementsHidden={collapsed} importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"} style={[style, { position: "relative", top: undefined, bottom: undefined, left: undefined, right: undefined, marginRight: 44 }]}>{children}</View>
    </FieldOverlayView>
  );
}
