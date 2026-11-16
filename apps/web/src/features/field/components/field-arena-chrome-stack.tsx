"use client";
import { FIELD_ARENA_CHROME_ORDER, type FieldArenaChromeSlot } from "@fitness-battle/shared";
import type { ReactNode } from "react";

export function FieldArenaChromeStack({ slots }: { slots: Partial<Record<FieldArenaChromeSlot, ReactNode>> }) {
  return (
    <div className="field-arena-chrome-stack">
      {FIELD_ARENA_CHROME_ORDER.map((slot) => (slots[slot] ? <div key={slot}>{slots[slot]}</div> : null))}
    </div>
  );
}