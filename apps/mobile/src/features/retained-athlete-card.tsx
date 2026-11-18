import { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from "react";
import { Platform, ScrollView, View } from "react-native";
import { usePathname } from "expo-router";
import { athleteCardModel, competeNow } from "@fitness-battle/shared";
import { useCompeteStore } from "../lib/compete-store";
import { AthleteCrest } from "./athlete-crest";

type Frame = { x: number; y: number; width: number; height: number; clipTop: number; clipBottom: number };
type Placement = { frame: Frame; onInteractionChange?: (held: boolean) => void };
const PlacementContext = createContext<((placement: Placement | null) => void) | null>(null);

/** One warmed WebView per account; navigation only changes its visible placement. */
export function RetainedAthleteCard({ children }: { children: ReactNode }) {
  const { state, accountKey } = useCompeteStore();
  const pathname = usePathname();
  const root = useRef<ComponentRef<typeof View>>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const model = useMemo(() => state ? athleteCardModel(state, competeNow(state)) : null, [state]);
  const frame = placement?.frame;
  const top = frame ? Math.max(frame.y, frame.clipTop) : 0;
  const bottom = frame ? Math.min(frame.y + frame.height, frame.clipBottom) : 0;
  const visible = pathname === "/athlete" && placement !== null && bottom > top;
  return <PlacementContext.Provider value={setPlacement}>
    <View ref={root} style={{ flex: 1 }} onLayout={() => root.current?.measureInWindow((x, y) => setOrigin({ x, y }))}>
      {children}
      {Platform.OS !== "web" && model && <View pointerEvents={visible ? "auto" : "none"} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
        style={{ position: "absolute", left: visible && frame ? frame.x - origin.x : -10000, top: top - origin.y, width: frame?.width ?? 320, height: Math.max(0, bottom - top), overflow: "hidden" }}>
        <View style={{ marginTop: frame ? frame.y - top : 0 }}>
          <AthleteCrest key={accountKey} model={model} active={visible} height={frame?.height ?? 430} onInteractionChange={visible ? placement?.onInteractionChange : undefined} />
        </View>
      </View>}
    </View>
  </PlacementContext.Provider>;
}

export type AthleteCardSlotHandle = { measure(): void };
export const AthleteCardSlot = forwardRef<AthleteCardSlotHandle, { viewport: RefObject<ComponentRef<typeof ScrollView> | null>; onInteractionChange?: (held: boolean) => void }>(function AthleteCardSlot({ viewport, onInteractionChange }, ref) {
  const place = useContext(PlacementContext);
  const slot = useRef<ComponentRef<typeof View>>(null);
  const mounted = useRef(false);
  const measure = useCallback(() => {
    slot.current?.measureInWindow((x, y, width, height) => {
      viewport.current?.measureInWindow((_x, clipTop, _width, clipHeight) => {
        if (!mounted.current) return;
        place?.({ frame: { x, y, width, height, clipTop, clipBottom: clipTop + clipHeight }, onInteractionChange });
      });
    });
  }, [place, viewport, onInteractionChange]);
  useImperativeHandle(ref, () => ({ measure }), [measure]);
  useEffect(() => { mounted.current = true; measure(); return () => { mounted.current = false; place?.(null); }; }, [measure, place]);
  return <View ref={slot} collapsable={false} onLayout={measure} style={{ height: 430 }} />;
});
