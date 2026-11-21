import { MEDAL_GOLD } from "@fitness-battle/shared";
import { PlatformColor } from "react-native";

/** UIKit resolves the named color for the display gamut. */
export const nativeMedalGold = PlatformColor(MEDAL_GOLD.iosColorName, { fallback: MEDAL_GOLD.srgb });
