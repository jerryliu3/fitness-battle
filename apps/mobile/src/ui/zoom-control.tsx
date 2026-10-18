import { useMemo, useRef, useState } from "react";
import { PanResponder, Text, View } from "react-native";
import { f } from "./focus";
import { SHELL_COLORS as c } from "../theme";
export function ZoomControl({
  value,
  maximum,
  onChange,
}: {
  value: number;
  maximum: number;
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(280);
  const latest = useRef({ value, maximum, onChange, width });
  latest.current = { value, maximum, onChange, width };
  const initial = useRef(0);
  const update = (x: number) => {
    const p = latest.current;
    p.onChange(0.5 + Math.min(1, Math.max(0, x / p.width)) * (p.maximum - 0.5));
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: (event) => {
          initial.current = event.nativeEvent.locationX;
          update(initial.current);
        },
        onPanResponderMove: (_, g) => update(initial.current + g.dx),
      }),
    [],
  );
  return (
    <View style={{ gap: 4 }}>
      <Text style={f.small}>Zoom</Text>
      <View
        {...pan.panHandlers}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Lane zoom range"
        accessibilityValue={{ min: 0.5, max: maximum, now: value }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) =>
          onChange(
            Math.max(
              0.5,
              Math.min(
                maximum,
                value + (event.nativeEvent.actionName === "increment" ? 1 : -1),
              ),
            ),
          )
        }
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <View
          style={{ height: 4, borderRadius: 2, backgroundColor: c.line }}
          pointerEvents="none"
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: `${Math.min(100, Math.max(0, ((value - 0.5) / (maximum - 0.5)) * 100))}%`,
            marginLeft: -9,
            height: 18,
            width: 18,
            borderRadius: 9,
            backgroundColor: c.ink,
          }}
        />
      </View>
    </View>
  );
}
