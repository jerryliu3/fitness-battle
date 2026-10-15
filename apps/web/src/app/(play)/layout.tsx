"use client";

import { useAuth } from "@/components/auth-context";
import { CompeteProvider, useCompete } from "@/components/compete-context";
import { NotificationTriggers } from "@/components/notification-triggers";
import { useTabCache } from "@/features/play/tab-cache";
import { useVisit, VisitProvider } from "@/features/play/visit";
import { PHONE_TABS, phoneTabFromPath } from "@fitness-battle/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import "@/features/split/split.css";
import "@/features/field/field.css";
import "@/features/rally/rally-shell.css";
import "@/features/rally/product.css";
import "@/features/play/play-shell.css";

function PlayChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { user, loading } = useAuth();
  const { saveError, legacyOffer, loadStatus, recoverLegacy, retryLoad } = useCompete();
  const { settle } = useVisit();
  useTabCache();
  const onboarding = path.startsWith("/onboarding");
  const active = phoneTabFromPath(path);

  if (onboarding) {
    return (
      <div className="fb">
        <div className="fb-scroll fb-scroll-solo">{children}</div>
      </div>
    );
  }

  return (
    <div className="ps-product">
      <div className="ps-phone">
        <a className="rf-skip" href="#ps-main">
          Skip to content
        </a>
        {saveError ? <p className="ps-status">{saveError}</p> : null}
        {legacyOffer ? (
          <p className="ps-status">
            This browser still has history from before accounts.{" "}
            <button type="button" onClick={recoverLegacy}>
              Use it on this account
            </button>
          </p>
        ) : null}
        {loadStatus === "failed" ? (
          <p className="ps-status">
            Account data couldn’t load. This screen is read-only.{" "}
            <button type="button" onClick={retryLoad}>
              Retry
            </button>
          </p>
        ) : null}
        {!loading && !user ? (
          <p className="ps-status">
            Browsing as a guest. <Link href="/signup">Create an account</Link> to join a field.
          </p>
        ) : null}
        <div className="ps-body" id="ps-main">
          {children}
        </div>
        <nav className="ps-dock" aria-label="App views">
          {PHONE_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active === tab.id ? "page" : undefined}
              onClick={() => {
                if (tab.id === "today") settle();
              }}
            >
              <i aria-hidden="true" />
              {tab.label}
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
      <VisitProvider>
        <PlayChrome>{children}</PlayChrome>
      </VisitProvider>
    </CompeteProvider>
  );
}
