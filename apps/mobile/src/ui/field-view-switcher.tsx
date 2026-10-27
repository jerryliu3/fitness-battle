import { View } from "react-native";
import { ChoicePicker } from "./choice-picker";

export function FieldViewSwitcher({ value, geographic, onChange, standings = false, onStandings, onZoomIn, onZoomOut }: {
  value: "2d" | "3d" | "4d"; geographic: boolean; onChange(value: "2d" | "3d" | "4d"): void;
  standings?: boolean; onStandings?: () => void;
  onZoomIn?: () => void; onZoomOut?: () => void;
}) {
  const options = [
    { value: "2d", label: "2D map" }, { value: "3d", label: "3D field" },
    ...(geographic ? [{ value: "4d", label: "4D course" }] : []),
    ...(onStandings ? [{ value: "standings", label: "Standings" }] : []),
    ...(onZoomIn ? [{ value: "zoom-in", label: "Zoom in" }] : []),
    ...(onZoomOut ? [{ value: "zoom-out", label: "Zoom out" }] : []),
  ];
  return <View style={{ maxWidth: 160 }}>
    <ChoicePicker label="Field view" value={standings ? "standings" : value} options={options}
      onChange={next => { if (next === "standings") onStandings?.(); else if (next === "zoom-in") onZoomIn?.(); else if (next === "zoom-out") onZoomOut?.(); else onChange(next as "2d" | "3d" | "4d"); }} />
  </View>;
}
