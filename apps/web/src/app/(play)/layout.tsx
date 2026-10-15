"use client";

import { useAuth } from "@/components/auth-context";
import { CompeteProvider, useCompete } from "@/components/compete-context";
import { NotificationTriggers } from "@/components/notification-triggers";
import { DockIcon } from "@/app/design/_studies/home-lab/secondary-views";
import { viewFromPath, type HomeView } from "@/features/home/product-home";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import "@/features/split/split.css";
import "@/features/field/field.css";
import "@/features/rally/rally-shell.css";
import "@/features/rally/product.css";
import "@/app/design/_studies/home-lab/home-lab.css";

const DOCK: { view: HomeView; href: string; label: string }[] = [
  { view: "today", href: "/", label: "Today" },
  { view: "arena", href: "/board", label: "Arena" },
  { view: "progress", href: "/progress", label: "Progress" },
  { view: "athlete", href: "/you", label: "Athlete" },
];

function PlayChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { user, loading } = useAuth();
  const { saveError, legacyOffer, loadStatus, recoverLegacy, retryLoad } = useCompete();
  const onboarding = path.startsWith("/onboarding");
  const active = viewFromPath(path);

  if (onboarding) {
    return (
      <div className="fb">
        <div className="fb-scroll fb-scroll-solo">{children}</div>
      </div>
    );
  }

  return (
    <div className="ah-product">
      <div className="ah-phone">
        <a className="rf-skip" href="#ah-main">
          Skip to content
        </a>
        {saveError ? <p className="ah-status">{saveError}</p> : null}
        {legacyOffer ? (
          <p className="ah-status">
            This browser still has history from before accounts.{" "}
            <button type="button" className="ah-text-link" onClick={recoverLegacy}>
              Use it on this account
            </button>
          </p>
        ) : null}
        {loadStatus === "failed" ? (
          <p className="ah-status">
            Account data couldn’t load. This screen is read-only.{" "}
            <button type="button" className="ah-text-link" onClick={retryLoad}>
              Retry
            </button>
          </p>
        ) : null}
        {!loading && !user ? (
          <p className="ah-status">
            Browsing as a guest. <Link href="/signup">Create an account</Link> to join a field.
          </p>
        ) : null}
        <div className="ah-shell-body" id="ah-main">
          {children}
        </div>
        <nav className="ah-dock" aria-label="App views">
          {DOCK.map((tab) => (
            <Link key={tab.href} href={tab.href} aria-current={active === tab.view ? "page" : undefined}>
              <DockIcon view={tab.view} />
              <span>{tab.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <CompeteProvider>
      <NotificationTriggers />
      <PlayChrome>{children}</PlayChrome>
    </CompeteProvider>
  );
}
