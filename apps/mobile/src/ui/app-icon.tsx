import IconStack2 from "@tabler/icons-react-native/IconStack2";
import IconPlayerPlay from "@tabler/icons-react-native/IconPlayerPlay";
import IconPlayerPause from "@tabler/icons-react-native/IconPlayerPause";
import Svg, { Path } from "react-native-svg";
import { SPORT_ICON_PATHS } from "@fitness-battle/shared";
import IconSettings from "@tabler/icons-react-native/IconSettings";
import { useThemeColors } from "../theme";
import IconUser from "@tabler/icons-react-native/IconUser";
import IconHome from "@tabler/icons-react-native/IconHome";
import IconBan from "@tabler/icons-react-native/IconBan";
import IconFlag from "@tabler/icons-react-native/IconFlag";
import IconChartLine from "@tabler/icons-react-native/IconChartLine";
import IconUsers from "@tabler/icons-react-native/IconUsers";
import IconRefresh from "@tabler/icons-react-native/IconRefresh";
import IconReload from "@tabler/icons-react-native/IconReload";
import IconArrowUpRight from "@tabler/icons-react-native/IconArrowUpRight";
import IconArrowLeft from "@tabler/icons-react-native/IconArrowLeft";
import IconPlus from "@tabler/icons-react-native/IconPlus";
import IconMaximize from "@tabler/icons-react-native/IconMaximize";
import IconPencil from "@tabler/icons-react-native/IconPencil";
import IconAdjustmentsHorizontal from "@tabler/icons-react-native/IconAdjustmentsHorizontal";
import IconBell from "@tabler/icons-react-native/IconBell";
import IconChartBar from "@tabler/icons-react-native/IconChartBar";
import IconChevronRight from "@tabler/icons-react-native/IconChevronRight";
import IconFlameFilled from "@tabler/icons-react-native/IconFlameFilled";
import { Platform } from "react-native";


const icons = {
  person: IconUser, home: IconHome, compete: IconFlag, progress: IconChartLine, crew: IconUsers,
  sync: IconRefresh, back: IconArrowLeft, plus: IconPlus, expand: IconMaximize, edit: IconPencil,
  layers: IconStack2, play: IconPlayerPlay, pause: IconPlayerPause,
  settings: IconSettings, preferences: IconAdjustmentsHorizontal, notifications: IconBell, scoring: IconChartBar,
  external: IconArrowUpRight, chevron: IconChevronRight, flame: IconFlameFilled,
  replay: IconReload, block: IconBan,
};
export type AppIconName = keyof typeof icons | keyof typeof SPORT_ICON_PATHS;

/** Decorative icons: the enclosing control or row owns its accessible name. */
export function AppIcon({ name, size = 24, color: suppliedColor }: {
  name: AppIconName; size?: number; color?: string;
}) {
  const c = useThemeColors();
  const color = suppliedColor ?? c.ink;
  if (name in SPORT_ICON_PATHS) return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessible={Platform.OS === "web" ? undefined : false} aria-hidden={Platform.OS === "web" ? true : undefined}><Path d={SPORT_ICON_PATHS[name as keyof typeof SPORT_ICON_PATHS]} /></Svg>;
  const Icon = icons[name as keyof typeof icons];
  return <Icon size={size} color={color} strokeWidth={1.8}
    aria-hidden={Platform.OS === "web" ? true : undefined}
    accessible={Platform.OS === "web" ? undefined : false}
    accessibilityElementsHidden={Platform.OS === "web" ? undefined : true} />;
}
