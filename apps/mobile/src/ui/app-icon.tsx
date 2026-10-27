import IconRun from "@tabler/icons-react-native/IconRun";
import IconWalk from "@tabler/icons-react-native/IconWalk";
import IconBike from "@tabler/icons-react-native/IconBike";
import IconBarbell from "@tabler/icons-react-native/IconBarbell";
import IconUser from "@tabler/icons-react-native/IconUser";
import IconHome from "@tabler/icons-react-native/IconHome";
import IconFlag from "@tabler/icons-react-native/IconFlag";
import IconChartLine from "@tabler/icons-react-native/IconChartLine";
import IconUsers from "@tabler/icons-react-native/IconUsers";
import IconRefresh from "@tabler/icons-react-native/IconRefresh";
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
import { SHELL_COLORS as c } from "../theme";

const icons = {
  running: IconRun, walking: IconWalk, cycling: IconBike, strength: IconBarbell,
  person: IconUser, home: IconHome, compete: IconFlag, progress: IconChartLine, crew: IconUsers,
  sync: IconRefresh, back: IconArrowLeft, plus: IconPlus, expand: IconMaximize, edit: IconPencil,
  preferences: IconAdjustmentsHorizontal, notifications: IconBell, scoring: IconChartBar,
  external: IconArrowUpRight, chevron: IconChevronRight, flame: IconFlameFilled,
};
export type AppIconName = keyof typeof icons;

/** Decorative icons: the enclosing control or row owns its accessible name. */
export function AppIcon({ name, size = 24, color = c.ink }: {
  name: AppIconName; size?: number; color?: string;
}) {
  const Icon = icons[name];
  return <Icon size={size} color={color} strokeWidth={1.8}
    aria-hidden={Platform.OS === "web" ? true : undefined}
    accessible={Platform.OS === "web" ? undefined : false}
    accessibilityElementsHidden={Platform.OS === "web" ? undefined : true} />;
}
