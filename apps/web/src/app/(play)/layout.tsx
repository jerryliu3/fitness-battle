"use client";

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

export default function PlayLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <CompeteProvider>
      <div className="fb">
        <div className="fb-scroll">{children}</div>
        <nav className="fb-tabs">
          {TABS.map((tab) => {
            const on =
              tab.href === "/"
                ? path === "/"
                : path.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href} className={on ? "on" : ""}>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </CompeteProvider>
  );
}
