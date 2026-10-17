"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { ArenaScreen } from "@/features/arena/arena-screen";
import { FieldScreen } from "@/features/field/field-screen";
import { TodayScreen } from "@/features/today/today-screen";
import YouRoute from "@/features/you/you-route";
import {
  SHELL_TABS,
  SHELL_TAB_ICONS,
  isShellTabId,
  shellTabFromPath,
  type ShellTabId,
} from "@fitness-battle/shared";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ReturnProgress } from "@/features/focus/return-progress";
import { BootSplash } from "./boot-splash";
import { isCompeteDataReady, shouldShowBootSplash } from "./boot-gate";
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
  const reduce = useReducedMotion();
  const { user, loading } = useAuth();
  const {
    state,
    saveError,
    legacyOffer,
    loadStatus,
    recoverLegacy,
    retryLoad,
  } = useCompete();
  const [pressed, setPressed] = useState<ShellTabId | null>(null);
  const [bootAnimDone, setBootAnimDone] = useState(false);
  const matched = shellTabFromPath(path)?.id ?? null;
  const active = pressed ?? matched;
  const accountKey = user?.id ?? "guest";
  const [visited, setVisited] = useState<Set<ShellTabId>>(() =>
    new Set(matched ? [matched] : ["today"]),
  );

  useEffect(() => {
    if (active && isShellTabId(active)) {
      setVisited((prev) => (prev.has(active) ? prev : new Set([...prev, active])));
    }
  }, [active]);

  const dataReady = isCompeteDataReady(loadStatus, state);

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
    setPressed(null);
  }, [path]);

  useEffect(() => {
    for (const tab of SHELL_TABS) router.prefetch(tab.href);
  }, [router]);

  // Finish the overtake animation even if compete state is already ready.
  if (shouldShowBootSplash(dataReady, bootAnimDone)) {
    return (
      <BootSplash
        waiting={bootAnimDone && !dataReady}
        onAnimationComplete={() => setBootAnimDone(true)}
      />
    );
  }

  return (
    <div className="phone-frame">
      <div className="phone-shell">
        <header className="focus-shell-header">
          <Link href="/today">OVERTAEK</Link>
          <span>A LITTLE FURTHER, TOGETHER.</span>
        </header>
        <ReturnProgress />
        {matched ? (
          <div className="phone-panels">
            {SHELL_TABS.map((tab) => {
              const on = active === tab.id;
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
            value={active ?? ""}
            onValueChange={(value) => {
              if (isShellTabId(value)) setPressed(value);
            }}
          >
            <Tabs.List className="phone-tabs" aria-label="Primary">
              {SHELL_TABS.map((tab) => {
                const on = active === tab.id;
                return (
                  <Tabs.Trigger key={tab.id} value={tab.id} asChild>
                    <Link
                      href={tab.href}
                      className="phone-tab"
                      onPointerDown={() => setPressed(tab.id)}
                    >
                      {on ? (
                        <motion.span
                          layoutId="shell-tab"
                          className="phone-pill"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { type: "spring", bounce: 0.18, duration: 0.35 }
                          }
                        />
                      ) : null}
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
                      <span>{tab.label}</span>
                    </Link>
                  </Tabs.Trigger>
                );
              })}
            </Tabs.List>
          </Tabs.Root>
        )}
      </div>
    </div>
  );
}
