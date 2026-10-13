"use client";

import { useTheme } from "@/theme/theme-provider";
import Link from "next/link";

export function ProductHeader({
  sourceStatus = "disconnected",
  sourceLabel = "No source",
}: {
  sourceStatus?: "disconnected" | "stub" | "connected";
  sourceLabel?: string;
}) {
  const { theme } = useTheme();
  return (
    <header className="sp-header">
      <Link href="/" className="sp-brand" aria-label={`${theme.label} home`}>
        {theme.wordmark}
        <span>{theme.mark}</span>
      </Link>
      <div className="sp-header-actions">
        <Link
          href="/you#connections"
          className="sp-source"
          data-status={sourceStatus}
        >
          <i aria-hidden />
          {sourceLabel}
        </Link>
      </div>
    </header>
  );
}

export function sourceFromLinks(
  links: { provider: string; linked: boolean; status: string }[],
): { status: "disconnected" | "stub" | "connected"; label: string } {
  const strava = links.find((link) => link.provider === "strava");
  if (!strava?.linked) {
    return { status: "disconnected", label: "Link source" };
  }
  if (strava.status === "connected") {
    return { status: "connected", label: "Strava live" };
  }
  return { status: "stub", label: "Demo source" };
}
