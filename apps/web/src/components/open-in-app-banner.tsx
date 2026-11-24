"use client";

import { nativeAppDeepLink } from "@fitness-battle/shared";
import { useEffect, useState } from "react";
import { isMobileWebClient } from "@/lib/guest-entry";
import { AppParagraph } from "@/ui/section";

interface OpenInAppBannerProps {
  nativePath: string;
  label?: string;
}

/**
 * Mobile-browser strip that offers opening the installed native app.
 * Universal links usually handle taps from messages; this helps pasted URLs in the browser.
 */
export function OpenInAppBanner({
  nativePath,
  label = "Open in Overtaek",
}: OpenInAppBannerProps) {
  const [visible, setVisible] = useState(false);
  const href = nativeAppDeepLink(nativePath);

  useEffect(() => {
    setVisible(isMobileWebClient());
  }, []);

  if (!visible) return null;

  return (
    <div
      className="open-in-app-banner"
      role="region"
      aria-label="Open in app"
      style={{
        position: "fixed",
        insetInline: 12,
        top: "max(12px, env(safe-area-inset-top))",
        zIndex: 130,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid var(--line)",
        background: "var(--card)",
        boxShadow: "0 8px 28px #142b3b22",
      }}
    >
      <AppParagraph typographyRole="caption" style={{ flex: 1, margin: 0 }}>
        Have the app installed?
      </AppParagraph>
      <a className="fb-btn" href={href} style={{ paddingInline: 14, minHeight: 36 }}>
        {label}
      </a>
      <button
        type="button"
        className="fb-btn-ghost"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
        style={{ minWidth: 36, paddingInline: 8 }}
      >
        ×
      </button>
    </div>
  );
}