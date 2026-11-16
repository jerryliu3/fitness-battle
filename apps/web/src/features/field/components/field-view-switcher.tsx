"use client";
import { APP_ICON_PATHS } from "@fitness-battle/shared";
import { colors as c } from "@/theme/app-colors";
import { typographyStyle } from "@/ui/section";
import { useEffect, useRef, useState } from "react";
import { playCue } from "@/lib/haptics";

type FieldView = "2d" | "3d" | "4d" | "graph";
type FieldViewOption = { value: FieldView; label: string; icon: keyof typeof APP_ICON_PATHS };

const VIEW_ICONS: Record<FieldView, keyof typeof APP_ICON_PATHS> = {
  "2d": "distance",
  "4d": "expand",
  "3d": "expand",
  graph: "progress",
};

function FieldIcon({ name, size = 22, color = "currentColor" }: { name: keyof typeof APP_ICON_PATHS; size?: number; color?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={APP_ICON_PATHS[name]} />
    </svg>
  );
}

export function FieldViewSwitcher({
  value,
  geographic,
  onChange,
  standings = false,
  onStandings,
}: {
  value: FieldView;
  geographic: boolean;
  onChange(value: FieldView): void;
  standings?: boolean;
  onStandings?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options: FieldViewOption[] = [
    { value: "2d", label: "2D", icon: "distance" },
    ...(geographic ? [{ value: "4d" as const, label: "3D", icon: "expand" as const }] : []),
    { value: "graph", label: "Timeline", icon: "progress" },
  ];
  const active = options.find((option) => option.value === value && !standings) ?? options[0]!;

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={`Field view: ${active.label}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 44,
          minHeight: 44,
          borderRadius: 999,
          border: "1px solid rgba(255, 255, 255, 0.2)",
          background: "rgba(20, 20, 19, 0.72)",
          color: "#ffffff",
          cursor: "pointer",
        }}
      >
        <FieldIcon name={VIEW_ICONS[value]} />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Field view"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 200,
            borderRadius: 14,
            border: `1px solid ${c.line}`,
            background: c.card,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.2)",
            overflow: "hidden",
            zIndex: 120,
          }}
        >
          {options.map((option) => {
            const selected = option.value === value && !standings;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  void playCue("selection");
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  ...typographyStyle("body"),
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  minHeight: 48,
                  padding: "0 12px",
                  border: 0,
                  background: selected ? "rgba(20, 20, 19, 0.08)" : "transparent",
                  color: selected ? c.ink : c.muted,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <FieldIcon name={option.icon} color={selected ? c.ink : c.muted} />
                <span style={{ flex: 1 }}>{option.label}</span>
                {selected ? <span aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
          {onStandings ? (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={standings}
              onClick={() => {
                void playCue("selection");
                onStandings();
                setOpen(false);
              }}
              style={{
                ...typographyStyle("body"),
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                minHeight: 48,
                padding: "0 12px",
                border: 0,
                borderTop: `1px solid ${c.line}`,
                background: standings ? "rgba(20, 20, 19, 0.08)" : "transparent",
                color: standings ? c.ink : c.muted,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <FieldIcon name="trophy" color={standings ? c.ink : c.muted} />
              <span style={{ flex: 1 }}>Standings</span>
              {standings ? <span aria-hidden="true">✓</span> : null}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}