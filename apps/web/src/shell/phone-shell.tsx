"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete, useCompeteFieldRefresh } from "@/components/compete-context";
import { ArenaScreen } from "@/features/arena/arena-screen";
import { FieldScreen } from "@/features/field/field-screen";
import { TodayScreen } from "@/features/today/today-screen";
import YouRoute from "@/features/you/you-route";
import {
  SHELL_TABS,
  SHELL_TAB_ICONS,
  isShellTabId,
  shellTabById,
  shellTabFromPath,
  type ShellTabId,
} from "@fitness-battle/shared";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ReturnProgress } from "@/features/focus/return-progress";
import { BootSplash } from "./boot-splash";
import {
  hasSeenBootSplash,
  isCompeteDataReady,
  markBootSplashSeen,
} from "./boot-gate";
import "./shell.css";

function renderTab(tabId: ShellTabId, accountKey: string): ReactNode {
  switch (tabId) {
    case "today":
      return <TodayScreen />;
    case "arena":
      return <ArenaScreen />;
    case "field":
      return <FieldScreen />;
    case "you":
      // Remount Athlete on account switch so form/local UI cannot leak across users.
      return <YouRoute key={accountKey} />;
  }
}

export function PhoneShell({
  children,
  hideTabs = false,
}: {
  children: ReactNode;
  hideTabs?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const {
    state,
    saveError,
    legacyOffer,
    loadStatus,
    recoverLegacy,
    retryLoad,
    fieldNotice,
  } = useCompete();
  const tab = shellTabFromPath(path);
  useCompeteFieldRefresh(!hideTabs && (tab?.id === "arena" || tab?.id === "field"));
  const [bootAnimDone, setBootAnimDone] = useState(() => hasSeenBootSplash());
  const matched = tab?.id ?? null;
  const accountKey = user?.id ?? "guest";
  const [visited, setVisited] = useState<Set<ShellTabId>>(() =>
    new Set(matched ? [matched] : ["today"]),
  );

  useEffect(() => {
    if (matched && isShellTabId(matched)) {
      setVisited((prev) => (prev.has(matched) ? prev : new Set([...prev, matched])));
    }
  }, [matched]);

  const dataReady = isCompeteDataReady(loadStatus, state);
  const routedNotice = useRef<string | null>(null);

  useEffect(() => {
    if (!fieldNotice?.personal || tab?.id === "arena") return;
    if (routedNotice.current === fieldNotice.title) return;
    routedNotice.current = fieldNotice.title;
    router.push("/arena");
  }, [fieldNotice, router, tab?.id]);

  function notices() {
    if (hideTabs) return null;
    return (
      <>
        {saveError ? <p className="phone-guest">{saveError}</p> : null}
        {legacyOffer ? (
          <p className="phone-guest">
            This browser still has history from before accounts.{" "}
            <button
              type="button"
              className="fb-btn-ghost"
              onClick={recoverLegacy}
            >
              Use it on this account
            </button>
          </p>
        ) : null}
        {loadStatus === "failed" ? (
          <p className="phone-guest">
            Could not load the account copy. This screen is read-only.{" "}
            <button type="button" className="fb-btn-ghost" onClick={retryLoad}>
              Retry
            </button>
          </p>
        ) : null}
        {!loading && !user ? (
          <p className="phone-guest">
            Browsing as a guest. <Link href="/signup">Create account</Link> ·{" "}
            <Link href="/login">Sign in</Link>
          </p>
        ) : null}
      </>
    );
  }

  function panel(body: ReactNode) {
    return (
      <ScrollArea.Root className="phone-scroll" type="scroll">
        <ScrollArea.Viewport>
          <div
            className={hideTabs ? "phone-main phone-main-solo" : "phone-main"}
          >
            {notices()}
            {body}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical">
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    );
  }

  useEffect(() => {
    for (const tab of SHELL_TABS) router.prefetch(tab.href);
  }, [router]);

  function goToTab(tabId: ShellTabId) {
    const href = shellTabById(tabId)?.href;
    if (!href || href === path.split("?")[0]) return;
    router.push(href);
  }

  // Only play the full initial mascot boot splash on fresh browser boot.
  // Account creation, login, or page transitions don't reload the splash.
  if (!bootAnimDone) {
    return (
      <BootSplash
        waiting={false}
        onAnimationComplete={() => {
          markBootSplashSeen();
          setBootAnimDone(true);
        }}
      />
    );
  }

  const accountLoadingBody = panel(
    <p
      className="fb-copy phone-account-loading"
      style={{ margin: "48px auto", textAlign: "center", maxWidth: "28ch" }}
      role="status"
    >
      Syncing your account…
    </p>,
  );

  return (
    <div className="phone-frame">
      <div className="phone-shell">
        <header className="focus-shell-header">
          <Link href="/today">OVERTAEK</Link>
          <span>A LITTLE FURTHER, TOGETHER.</span>
        </header>
        {fieldNotice ? null : <ReturnProgress />}
        {!dataReady ? (
          accountLoadingBody
        ) : matched ? (
          <div className="phone-panels">
            {SHELL_TABS.map((tab) => {
              const on = matched === tab.id;
              return (
                <div
                  key={tab.id}
                  className={on ? "phone-panel is-active" : "phone-panel"}
                  inert={!on}
                  aria-hidden={!on}
                >
                  {visited.has(tab.id) ? panel(renderTab(tab.id, accountKey)) : null}
                </div>
              );
            })}
          </div>
        ) : (
          panel(children)
        )}
        {hideTabs ? null : (
          <Tabs.Root
            value={matched ?? ""}
            onValueChange={(value) => {
              if (isShellTabId(value)) goToTab(value);
            }}
          >
            <Tabs.List className="phone-tabs" aria-label="Primary">
              {SHELL_TABS.map((tab) => (
                <Tabs.Trigger key={tab.id} value={tab.id} className="phone-tab">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    style={{ position: "relative", zIndex: 1 }}
                  >
                    <path
                      d={SHELL_TAB_ICONS[tab.id]}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span style={{ position: "relative", zIndex: 1 }}>{tab.label}</span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
        )}
      </div>
    </div>
  );
}
