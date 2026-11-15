import { compactTimeZoneOptions } from "@fitness-battle/shared";
import { useMemo } from "react";
import { ChoicePicker } from "./choice-picker";

export function TimezonePicker({
  label = "Time zone",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (timeZone: string) => void;
}) {
  const options = useMemo(() => compactTimeZoneOptions(), []);
  return (
    <ChoicePicker
      label={label}
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}