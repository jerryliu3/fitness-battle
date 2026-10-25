"use client";
import { useState, type ReactNode } from "react";
import { initialsFromName, SHELL_COLORS as c } from "@fitness-battle/shared";
import { typographyStyle } from "./section";

/** Actual authorized portrait first; initials/icon only if absent or failed. */
export function UserAvatar({ src, name, size = 38, className, fallback, decorative = true, highlight = false }: {
  src?: string | null; name: string; size?: number; className?: string; fallback?: ReactNode; decorative?: boolean; highlight?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = src?.trim();
  return <span className={className} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : name} aria-hidden={decorative || undefined} title={name}
    style={{ ...typographyStyle("label"), width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "inline-flex", flexShrink: 0, alignItems: "center", justifyContent: "center", background: highlight ? c.tennis : c.soft, border: highlight ? `2px solid ${c.tennis}` : undefined, color: c.ink }}>
    {url && failed !== url ? <img src={url} alt="" onError={() => setFailed(url)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : fallback ?? (initialsFromName(name) || "?")}
  </span>;
}
