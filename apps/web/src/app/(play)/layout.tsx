"use client";

import { useAuth } from "@/components/auth-context";
import { CompeteProvider } from "@/components/compete-context";
import { NavIcon } from "@/features/evolution-lab/brand-art";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import "@/features/split/split.css";
import "@/features/field/field.css";
import "@/features/rally-lab/rally-focus.css";
import "@/features/rally/product.css";

const TABS = [
  { href: "/", label: "My week", kind: "track" as const },
  { href: "/board", label: "Matchups", kind: "field" as const },
  { href: "/splits", label: "Moves", kind: "splits" as const },
  { href: "/you", label: "You", kind: "athlete" as const },
];

function PlayChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { user, loading } = useAuth();
  const hideTabs = path.startsWith("/onboarding");
  const view =
    path.startsWith("/board")
      ? "matchups"
      : path.startsWith("/splits")
        ? "moves"
        : path.startsWith("/you")
          ? "you"
          : "week";

  if (hideTabs) {
    return (
      <div className="fb">
        <div className="fm-frame">
          <div className="fb-scroll fb-scroll-solo">
            <div className="sp-shell">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fb">
      <div
        className="rally-focus"
        data-product="on"
        data-view={view}
        data-ink="on"
      >
        <a className="rf-skip" href="#rf-main">
          Skip to my week
        </a>
        <div className="rf-app">
          <header className="rf-header">
            <Link className="rf-wordmark" href="/">
              RALLY<span>EVERYDAY PLAY.</span>
            </Link>
            <nav aria-label="Primary">
              {TABS.map((tab) => {
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
              Clubhouse ↗
            </Link>
          </header>
          {!loading && !user ? (
            <p className="fb-guest-banner">
              Browsing as a guest.{" "}
              <Link href="/signup">Create an account</Link> to join a board or
              open You.
            </p>
          ) : null}
          <div className="rf-product-main" id="rf-main">
            {children}
          </div>
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
