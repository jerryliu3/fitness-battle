import { useEffect, useId, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  type ScrollViewInstance,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import {
  portraitField,
  portraitFieldGap,
  type ArenaSceneLane,
  type ArenaViewWindow,
} from "@fitness-battle/shared";
import { drawFieldNode } from "./field-course";
import { alpineTrail } from "./club-art";
export function PortraitField({
  lanes,
  view,
  unit,
  onZoom,
  onSelect,
}: {
  lanes: ArenaSceneLane[];
  view: ArenaViewWindow;
  unit: string;
  onZoom: (span: number) => void;
  onSelect: (id: string) => void;
}) {
  const [laneOffset, setLaneOffset] = useState(0);
  const prefix = useId().replace(/:/g, "");
  const scene = portraitField(lanes, view, undefined, laneOffset, prefix);
  const [width, setWidth] = useState(340);
  const scroll = useRef<ScrollViewInstance>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const moveTo = (offset: number) => {
    const focus = Math.max(
      0,
      Math.min(scene.ordered.length - 1, scene.baseFocus + offset),
    );
    setLaneOffset(focus - scene.baseFocus);
    scroll.current?.scrollTo({ x: focus * 110, animated: true });
  };
  const shift = (d: number) => moveTo(laneOffset + d);
  useEffect(() => {
    setLaneOffset(0);
    scroll.current?.scrollTo({ x: scene.baseFocus * 110, animated: false });
  }, [width, scene.baseFocus, scene.ordered.length]);
  return (
    <View style={{ gap: 10 }}>
      <View style={s.status} pointerEvents="none">
        <Text style={[s.white, { color: "#142b3b" }]}>
          {scene.place} / {scene.fieldSize} PLACE
        </Text>
        <Text
          style={[s.white, { color: "#142b3b", fontSize: 11, flexShrink: 1, textAlign: "right" }]}
        >
          {portraitFieldGap(scene.nextGap, unit)}
        </Text>
      </View>
    <View
      style={s.board}
      onLayout={(e) => {
        if (e.nativeEvent.layout.width > 0)
          setWidth(e.nativeEvent.layout.width);
      }}
    >
      <Image source={alpineTrail} style={s.scenery} />
      <Animated.ScrollView
        ref={scroll}
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        alwaysBounceVertical={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFill}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
          listener: (e: { nativeEvent: { contentOffset: { x: number } } }) => setLaneOffset(e.nativeEvent.contentOffset.x / 110 - scene.baseFocus),
        })}
      >
        <View
          style={{
            width: width + Math.max(0, scene.ordered.length - 1) * 110,
            height: 560,
          }}
        >
          <Animated.View style={{ position: "absolute", width, height: 560, transform: [{ translateX: scrollX }] }}>
          <Svg
            width={width}
            height="100%"
            viewBox="0 0 420 600"
            preserveAspectRatio="none"
            accessibilityLabel="Fixed perspective competition field"
          >
            <Defs>
              <LinearGradient
                id={`${prefix}-shade`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0%" stopColor="#0b3038" stopOpacity={0} />
                <Stop offset="100%" stopColor="#0b3038" />
              </LinearGradient>
            </Defs>
            <Rect
              y={80}
              width={420}
              height={520}
              fill={`url(#${prefix}-shade)`}
            />
            {scene.ground.map(drawFieldNode)}
            <Defs>
              <LinearGradient
                id={`${prefix}-horizon`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0%" stopColor="#b4d3cd" stopOpacity={0} />
                <Stop offset="55%" stopColor="#b4d3cd" stopOpacity={0.2} />
                <Stop offset="100%" stopColor="#b4d3cd" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect
              y={126}
              width={420}
              height={110}
              fill={`url(#${prefix}-horizon)`}
            />
            {scene.markers.map((m) => (
              <G key={`trail-${m.id}`} pointerEvents="none">
                <Path
                  d={m.trail}
                  stroke={m.color}
                  strokeWidth={12}
                  opacity={0.12}
                  fill="none"
                />
                <Path
                  d={m.trail}
                  stroke={m.color}
                  strokeWidth={5}
                  opacity={m.ghost ? 0.4 : 0.8}
                  strokeDasharray={m.ghost ? "5 6" : undefined}
                  fill="none"
                />
              </G>
            ))}
            {scene.markers
              .filter((m) => m.x > 28 && m.x < 392)
              .sort((a, b) => a.y - b.y)
              .map((m, i) => {
                const id = `${prefix}-portrait-${i}`;
                return (
                  <G
                    key={m.id}
                    transform={`translate(${m.x} ${m.y}) scale(${m.scale})`}
                    onPress={() => onSelect(m.id)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`${m.name}${m.you ? ", you" : ""}, ${m.gap.toFixed(1)} ${unit}${m.outside ? ", outside visible distance range" : ""}`}
                  >
                    <Ellipse
                      cy={27}
                      rx={24}
                      ry={10}
                      fill={m.color}
                      opacity={0.16}
                    />
                    <Ellipse
                      cy={27}
                      rx={16}
                      ry={6}
                      fill="#143c43"
                      stroke={m.color}
                      strokeWidth={2.5}
                    />
                    <Ellipse cy={27} rx={5} ry={2} fill={m.color} />
                    <Path
                      d="M-9 12 L0 27 L9 12"
                      fill={m.you ? "#f7c948" : "#f8f9f6"}
                    />
                    <Rect
                      x={-23}
                      y={-43}
                      width={46}
                      height={58}
                      rx={12}
                      fill="#f8f9f6"
                      stroke={m.you ? "#f7c948" : "#b3c9c5"}
                      strokeWidth={m.you ? 3 : 1.5}
                    />
                    <Defs>
                      <ClipPath id={id}>
                        <Rect x={-19} y={-39} width={38} height={50} rx={9} />
                      </ClipPath>
                    </Defs>
                    {m.avatarUrl ? (
                      <SvgImage
                        href={{ uri: m.avatarUrl }}
                        x={-19}
                        y={-39}
                        width={38}
                        height={50}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#${id})`}
                      />
                    ) : (
                      <>
                        <Rect
                          x={-19}
                          y={-39}
                          width={38}
                          height={50}
                          rx={9}
                          fill={m.you ? "#f7c948" : "#d8e5df"}
                        />
                        <SvgText
                          y={-8}
                          textAnchor="middle"
                          fill="#142b3b"
                          fontWeight="700"
                          fontSize={15}
                        >
                          {m.initials}
                        </SvgText>
                      </>
                    )}
                    {m.you ? (
                      <>
                        <Rect
                          x={-22}
                          y={-66}
                          width={44}
                          height={18}
                          rx={9}
                          fill="#f7c948"
                        />
                        <SvgText
                          y={-53}
                          textAnchor="middle"
                          fill="#142b3b"
                          fontSize={11}
                          fontWeight="800"
                        >
                          YOU
                        </SvgText>
                      </>
                    ) : null}
                    <SvgText
                      y={45}
                      textAnchor="middle"
                      fill="white"
                      fontSize={12}
                      fontWeight="700"
                    >
                      {m.ghost
                        ? "Past you"
                        : m.you
                          ? "You"
                          : m.name.split(" ")[0]}
                    </SvgText>
                    {!m.you ? (
                      <SvgText
                        y={61}
                        textAnchor="middle"
                        fill="#e5eee5"
                        fontSize={11}
                      >
                        {m.outside ? `${m.direction} ` : ""}
                        {m.gap > 0 ? "+" : ""}
                        {m.gap.toFixed(unit === "pts" ? 0 : 2)} {unit}
                      </SvgText>
                    ) : null}
                  </G>
                );
              })}
          </Svg>
          </Animated.View>
        </View>
      </Animated.ScrollView>
      <View style={s.controls}>
        <View style={s.controlRow}>
          <Pressable
            style={s.button}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            disabled={view.span >= (unit === "pts" ? 100 : 40)}
            onPress={() =>
              onZoom(Math.min(unit === "pts" ? 100 : 40, view.span * 1.5))
            }
          >
            <Text style={s.white}>−</Text>
          </Pressable>
          <Text style={s.white}>Zoom</Text>
          <Pressable
            style={s.button}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            disabled={view.span <= (unit === "pts" ? 2 : 0.5)}
            onPress={() =>
              onZoom(Math.max(unit === "pts" ? 2 : 0.5, view.span / 1.5))
            }
          >
            <Text style={s.white}>＋</Text>
          </Pressable>
        </View>
        <View style={s.controlRow}>
          <Pressable
            style={s.button}
            accessibilityRole="button"
            accessibilityLabel="Previous lane"
            disabled={scene.focus <= 0}
            onPress={() => shift(-1)}
          >
            <Text style={s.white}>←</Text>
          </Pressable>
          <Pressable
            style={s.button}
            accessibilityRole="button"
            accessibilityLabel="Your lane"
            onPress={() => moveTo(0)}
          >
            <Text style={s.white}>Your lane</Text>
          </Pressable>
          <Pressable
            style={s.button}
            accessibilityRole="button"
            accessibilityLabel="Next lane"
            disabled={scene.focus >= scene.ordered.length - 1}
            onPress={() => shift(1)}
          >
            <Text style={s.white}>→</Text>
          </Pressable>
        </View>
      </View>
    </View>
    </View>
  );
}
const s = StyleSheet.create({
  board: {
    height: 560,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0b3038",
  },
  scenery: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 230,
  },
  status: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  white: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 13 },
  controls: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#102e38ed",
    borderWidth: 1,
    borderColor: "#68858a",
    borderRadius: 28,
    paddingHorizontal: 6,
  },
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
