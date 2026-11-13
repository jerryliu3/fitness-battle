"use client";

import type { AppearanceMode } from "../vitals-body/types";

/** Hollow glass scan cylinder (2D overlay matching product mock). */
export function VitalsLabChamber({
  appearance,
  scanY,
  scanning,
}: {
  appearance: AppearanceMode;
  scanY: number;
  scanning: boolean;
}) {
  const dark = appearance === "dark";
  const stroke = dark ? "rgba(108, 229, 232, 0.35)" : "rgba(14, 124, 134, 0.28)";
  const wall = dark
    ? "rgba(17, 34, 44, 0.22)"
    : "rgba(255, 255, 255, 0.45)";
  const gold = dark ? "rgba(243, 201, 82, 0.55)" : "rgba(217, 155, 22, 0.5)";
  const laser = dark ? "#6CE5E8" : "#0E7C86";

  return (
    <svg
      className="vitals-lab-chamber"
      viewBox="0 0 320 480"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="vl-wall" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={dark ? "#38bdf8" : "#0284c7"} stopOpacity={0.18} />
          <stop offset="50%" stopColor={wall} stopOpacity={0.35} />
          <stop offset="100%" stopColor={dark ? "#38bdf8" : "#0284c7"} stopOpacity={0.18} />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="88" rx="118" ry="22" fill="none" stroke={stroke} strokeWidth="1.2" />
      <ellipse cx="160" cy="96" rx="108" ry="16" fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.55" />
      <path
        d="M42 108 L42 392 L278 392 L278 108 Z"
        fill="url(#vl-wall)"
        opacity="0.75"
      />
      <ellipse cx="160" cy="404" rx="120" ry="24" fill="none" stroke={stroke} strokeWidth="1.3" />
      <ellipse cx="160" cy="412" rx="100" ry="14" fill="none" stroke={gold} strokeWidth="1.4" />
      {scanning ? (
        <g opacity="0.92">
          <ellipse
            cx="160"
            cy={80 + scanY * 320}
            rx="124"
            ry="8"
            fill="none"
            stroke={laser}
            strokeWidth="2"
          />
          <ellipse
            cx="160"
            cy={80 + scanY * 320}
            rx="138"
            ry="14"
            fill={laser}
            opacity="0.12"
          />
        </g>
      ) : null}
    </svg>
  );
}
