"use client";
import { competeFieldSwitcherOptions, type CompeteArenaEvent, type FieldViewDimension } from "@fitness-battle/shared";

import { APP_ICON_PATHS, APP_ICON_VIEW_BOX } from "@fitness-battle/shared";
import { colors as c } from "@/theme/app-colors";
import { typographyStyle } from "@/ui/section";
import { useEffect, useRef, useState } from "react";
import { playCue } from "@/lib/haptics";

type FieldView = FieldViewDimension;

const VIEW_ICONS: Record<FieldView, keyof typeof APP_ICON_PATHS> = {
  "2d": "distance",
  "4d": "cubeFocus",
  "3d": "cubeFocus",
  graph: "progress",
};

function FieldIcon({ name, size = 22, color = "currentColor" }: { name: keyof typeof APP_ICON_PATHS; size?: number; color?: string }) {
  const viewBox = APP_ICON_VIEW_BOX[name] ?? "0 0 24 24";
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox={viewBox} fill={color}>
      <path d={APP_ICON_PATHS[name]} />
    </svg>
  );
}

export function FieldViewSwitcher({
  value,
  event,
  onChange,
  standings = false,
  onStandings,
}: {
  value: FieldView;
  event: CompeteArenaEvent;
  onChange(value: FieldView): void;
  standings?: boolean;
  onStandings?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = competeFieldSwitcherOptions(event);
  const active = options.find((option) => option.value === value) ?? options[0]!;

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
        className="map-hud-control"
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
                <FieldIcon name={VIEW_ICONS[option.value]} color={selected ? c.ink : c.muted} />
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
