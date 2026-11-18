import { SHELL_SPACING } from "@fitness-battle/shared";
import { StyleSheet } from "react-native";

/** Expand page-level scroll viewports; retain the gutter inside their content. */
export const pageCarouselStyles = StyleSheet.create({
  viewport: { marginHorizontal: -SHELL_SPACING.page },
  content: { paddingHorizontal: SHELL_SPACING.page },
});
