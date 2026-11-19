import { useState, type ComponentRef, type Ref } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { useThemeColors } from "../theme";
import { useFocusStyles } from "./focus";
import { AppText } from "./section";

export function TextField({ label, error, ref, style, onFocus, onBlur, ...props }: TextInputProps & {
  label: string;
  error?: string | null;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}) {
  const [focused, setFocused] = useState(false);
  const c = useThemeColors();
  const f = useFocusStyles();

  return (
    <View style={{ gap: 3 }}>
      <AppText role="label" accessible={false}>{label}</AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={c.textSecondary}
        {...props}
        onFocus={event => { setFocused(true); onFocus?.(event); }}
        onBlur={event => { setFocused(false); onBlur?.(event); }}
        style={[f.input, { minHeight: 44, paddingVertical: 8 }, style, focused && { borderColor: c.focusRing }, error && { borderColor: c.statusError }]}
      />
      {error && <AppText role="caption" accessibilityRole="alert" style={{ color: c.statusError }}>{error}</AppText>}
    </View>
  );
}
