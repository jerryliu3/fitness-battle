"use client";

import { useAuth } from "@/components/auth-context";
import { CompeteProvider, useCompete } from "@/components/compete-context";
import { NavIcon } from "@/features/evolution-lab/brand-art";
import { useTheme } from "@/theme/theme-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import "@/features/split/split.css";
import "@/features/field/field.css";
import "@/features/rally-lab/rally-focus.css";
import "@/features/rally/product.css";

/** Shared jobs; Rally theme uses friendlier labels without changing routes. */
const TABS = {
  rally: [
    { href: "/", label: "My week", kind: "track" as const },
    { href: "/board", label: "Matchups", kind: "field" as const },
    { href: "/splits", label: "Moves", kind: "splits" as const },
    { href: "/progress", label: "Progress", kind: "athlete" as const },
    { href: "/you", label: "You", kind: "athlete" as const },
  ],
  classic: [
    { href: "/", label: "My track", kind: "track" as const },
    { href: "/board", label: "The field", kind: "field" as const },
    { href: "/splits", label: "Splits", kind: "splits" as const },
    { href: "/progress", label: "Progress", kind: "athlete" as const },
    { href: "/you", label: "Athlete", kind: "athlete" as const },
  ],
} as const;

function PlayChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { user, loading } = useAuth();
  const { saveError, legacyOffer, loadStatus, recoverLegacy, retryLoad } = useCompete();
  const { theme } = useTheme();
  const hideTabs = path.startsWith("/onboarding");
  const tabs = theme.id === "rally" ? TABS.rally : TABS.classic;
  const youLabel = theme.id === "rally" ? "You" : "Athlete";
  const view =
    path.startsWith("/board")
      ? "matchups"
      : path.startsWith("/splits")
        ? "moves"
        : path.startsWith("/you")
          ? "you"
          : "week";

  if (theme.id === "rally" && !hideTabs) {
    return (
      <div className="fb">
        <div
          className="rally-focus"
          data-product="on"
          data-view={view}
          data-ink="on"
        >
          <a className="rf-skip" href="#rf-main">
            Skip to content
          </a>
          <div className="rf-app">
            <header className="rf-header">
              <Link className="rf-wordmark" href="/">
                RALLY<span>EVERYDAY PLAY.</span>
              </Link>
              <nav aria-label="Primary">
                {tabs.map((tab) => {
                  const on =
                    tab.href === "/" ? path === "/" : path.startsWith(tab.href);
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      aria-current={on ? "page" : undefined}
                    >
                      <NavIcon kind={tab.kind} />
                      <span>{tab.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <Link className="rf-club" href="/board">
                The field ↗
              </Link>
            </header>
            {!loading && !user ? (
              <p className="fb-guest-banner">
                Browsing as a guest.{" "}
                <Link href="/signup">Create an account</Link> to join a board or
                open {youLabel}.
              </p>
            ) : null}
            <div className="rf-product-main sp-shell" id="rf-main">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fb">
      <div className="fm-frame">
        {hideTabs ? null : (
          <nav className="fb-tabs" aria-label="Primary">
            {tabs.map((tab) => {
              const on =
                tab.href === "/" ? path === "/" : path.startsWith(tab.href);
              return (
                <Link key={tab.href} href={tab.href} className={on ? "on" : ""}>
                  {theme.id === "form" ? (
                    <span className="fm-nav-icon">
                      <NavIcon kind={tab.kind} />
                    </span>
                  ) : null}
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}
        <div className={`fb-scroll${hideTabs ? " fb-scroll-solo" : ""}`}>
          {!hideTabs && saveError ? (
            <p className="fb-guest-banner">{saveError}</p>
          ) : null}
          {!hideTabs && legacyOffer ? (
            <p className="fb-guest-banner">
              This browser still has history from before accounts.{" "}
              <button type="button" className="fb-btn-ghost" onClick={recoverLegacy}>
                Use it on this account
              </button>
            </p>
          ) : null}
          {!hideTabs && loadStatus === "failed" ? (
            <p className="fb-guest-banner">
              Could not load the account copy. This screen is read-only.{" "}
              <button type="button" className="fb-btn-ghost" onClick={retryLoad}>
                Retry
              </button>
            </p>
          ) : null}
          {!hideTabs && !loading && !user ? (
            <p className="fb-guest-banner">
              Browsing as a guest.{" "}
              <Link href="/signup">Create an account</Link> to join a board or
              open {youLabel}.
            </p>
          ) : null}
          <div className="sp-shell">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <CompeteProvider>
      <PlayChrome>{children}</PlayChrome>
    </CompeteProvider>
  );
}
