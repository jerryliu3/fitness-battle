import { createElement } from "react";
import { SHELL_COLORS as c } from "../theme";
const style = { minHeight: 48, border: `1px solid ${c.line}`, borderRadius: 12, padding: 12, color: c.ink, background: c.card, font: "inherit", width: "100%", boxSizing: "border-box" as const };
export function NumberPicker({ label, value, onChange, max = 1440, step = 1, unit }: { label: string; value: string; onChange: (value: string) => void; max?: number; step?: number; unit: string }) {
  return createElement("input", { type: "number", "aria-label": `${label} (${unit})`, value, min: 0, max, step, style, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value) });
}
export function DateTimeField({ label, value, mode, onChange }: { label: string; value: string; mode: "date" | "time"; onChange: (value: string) => void; clearLabel?: string }) {
  return createElement("input", { type: mode, "aria-label": label, value, style, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value) });
}
