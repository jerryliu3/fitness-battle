"use client";

import { useAuth } from "@/components/auth-context";
import { CompeteProvider } from "@/components/compete-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/board", label: "Board" },
  { href: "/pace", label: "Pace" },
  { href: "/you", label: "You" },
];

function PlayChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { user, loading } = useAuth();
  const hideTabs = path.startsWith("/onboarding");

  return (
    <div className="fb">
      <div className={`fb-scroll${hideTabs ? " fb-scroll-solo" : ""}`}>
        {!hideTabs && !loading && !user ? (
          <p className="fb-guest-banner">
            Browsing as a guest.{" "}
            <Link href="/signup">Create an account</Link> to join a board or open
            You.
          </p>
        ) : null}
        {children}
      </div>
      {hideTabs ? null : (
        <nav className="fb-tabs">
          {TABS.map((tab) => {
            const on =
              tab.href === "/" ? path === "/" : path.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href} className={on ? "on" : ""}>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
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
