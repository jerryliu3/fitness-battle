import { useState } from "react";
import { Platform, Pressable, TextInput, View, type TextInputProps } from "react-native";
import { AppIcon } from "./app-icon";
import { useThemeColors } from "../theme";
import { AppText, textStyle } from "./section";

export function SearchField({ onFocus, onBlur, onChangeText, value, ...props }: TextInputProps) {
  const c = useThemeColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingLeft: 14, paddingRight: 8,
      borderRadius: 999, borderWidth: 1, borderColor: focused ? c.focusRing : "transparent",
      backgroundColor: focused ? c.card : c.accentSecondarySoft,
    }}>
      <AppIcon name="search" size={18} color={c.textSecondary} />
      <TextInput
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        placeholderTextColor={c.textSecondary}
        {...props}
        value={value}
        onChangeText={onChangeText}
        onFocus={event => { setFocused(true); onFocus?.(event); }}
        onBlur={event => { setFocused(false); onBlur?.(event); }}
        style={[textStyle("body"), { color: c.ink, flex: 1, minWidth: 0, minHeight: 46, paddingVertical: 8 }, props.style]}
      />
      {Platform.OS !== "ios" && !!value && onChangeText && (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText("")}
          style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" }}>
          <AppText role="label">Clear</AppText>
        </Pressable>
      )}
    </View>
  );
}
