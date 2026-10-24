import Svg, { Path } from "react-native-svg";
import { SPORT_ICON_PATHS, type SportId } from "@fitness-battle/shared";
import { SHELL_COLORS as c } from "../theme";
export function SportIcon({ sport }: { sport: SportId }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden><Path d={SPORT_ICON_PATHS[sport]} /></Svg>;
}
