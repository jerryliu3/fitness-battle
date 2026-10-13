"use client";

import { useAuth } from "@/components/auth-context";
import { CompeteProvider } from "@/components/compete-context";
import { NavIcon } from "@/features/evolution-lab/brand-art";
import { useTheme } from "@/theme/theme-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import "@/features/split/split.css";
import "@/features/field/field.css";

const TABS = [
  { href: "/", label: "My track" },
  { href: "/board", label: "The field" },
  { href: "/splits", label: "Splits" },
  { href: "/you", label: "Athlete" },
];

const NAV_KIND = {
  "/": "track",
  "/board": "field",
  "/splits": "splits",
  "/you": "athlete",
} as const;

function PlayChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const hideTabs = path.startsWith("/onboarding");

  return (
    <div className="fb">
      <div className="fm-frame">
        {hideTabs ? null : (
          <nav className="fb-tabs" aria-label="Primary">
            {TABS.map((tab) => {
              const on =
                tab.href === "/" ? path === "/" : path.startsWith(tab.href);
              const kind = NAV_KIND[tab.href as keyof typeof NAV_KIND];
              return (
                <Link key={tab.href} href={tab.href} className={on ? "on" : ""}>
                  {theme.id === "form" ? (
                    <span className="fm-nav-icon">
                      <NavIcon kind={kind} />
                    </span>
                  ) : null}
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}
        <div className={`fb-scroll${hideTabs ? " fb-scroll-solo" : ""}`}>
          {!hideTabs && !loading && !user ? (
            <p className="fb-guest-banner">
              Browsing as a guest.{" "}
              <Link href="/signup">Create an account</Link> to join a board or open
              Athlete.
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
