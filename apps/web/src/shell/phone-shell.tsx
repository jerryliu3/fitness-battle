"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete, useCompeteFieldRefresh } from "@/components/compete-context";
import { ArenaScreen } from "@/features/arena/arena-screen";
import { FieldScreen } from "@/features/field/field-screen";
import { TodayScreen } from "@/features/today/today-screen";
import YouRoute from "@/features/you/you-route";
import {
  initialsFromName,
  SHELL_TABS,
  SHELL_TAB_ICONS,
  isShellTabId,
  shellTabFromPath,
  type ShellTabId,
} from "@fitness-battle/shared";
import { playCue } from "@/lib/haptics";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  const reduce = useReducedMotion();
  const { user, loading } = useAuth();
  const {
    state,
    loadStatus,
    retryLoad,
    fieldNotice,
  } = useCompete();
  const profileLabel = state?.name ?? user?.email ?? "You";
  const tab = shellTabFromPath(path);
  useCompeteFieldRefresh(!hideTabs && (tab?.id === "arena" || tab?.id === "field"));
  const [intent, setIntent] = useState<ShellTabId | null>(null);
  const [bootAnimDone, setBootAnimDone] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);
  const matched = tab?.id ?? null;
  const active = intent ?? matched;
  const accountKey = user?.id ?? "guest";
  const [visited, setVisited] = useState<Set<ShellTabId>>(
    () => new Set(["today"]),
  );

  useLayoutEffect(() => {
    setBootAnimDone(hasSeenBootSplash());
    setBootChecked(true);
  }, []);

  useEffect(() => {
    if (active && isShellTabId(active)) {
      setVisited((prev) => (prev.has(active) ? prev : new Set([...prev, active])));
    }
  }, [active]);

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
    if (matched && matched === intent) setIntent(null);
  }, [path, matched, intent]);

  function goTab(tabId: ShellTabId) {
    if (tabId === active) return;
    setIntent(tabId);
    const href = SHELL_TABS.find((t) => t.id === tabId)?.href;
    if (!href) return;
    void playCue("selection");
    router.push(href);
  }

  useEffect(() => {
    for (const tab of SHELL_TABS) router.prefetch(tab.href);
  }, [router]);

  // Only play the full initial mascot boot splash on fresh browser boot.
  // Account creation, login, or page transitions don't reload the splash.
  if (!bootChecked) return null;
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
          <span className="focus-shell-tagline">A LITTLE FURTHER, TOGETHER.</span>
          <Link
            href="/you?edit=profile"
            className="focus-shell-profile"
            aria-label="Open your profile"
          >
            {state?.avatarUrl ? (
              <img src={state.avatarUrl} alt="" className="focus-shell-profile-img" />
            ) : (
              <span>{initialsFromName(profileLabel)}</span>
            )}
          </Link>
        </header>
        {fieldNotice ? null : <ReturnProgress />}
        {!dataReady ? (
          accountLoadingBody
        ) : matched ? (
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
          <nav className="phone-tabs" aria-label="Primary">
              {SHELL_TABS.map((tab) => {
                const on = active === tab.id;
                return (
                    <Link
                      key={tab.id}
                      aria-current={on ? "page" : undefined}
                      href={tab.href}
                      className="phone-tab"
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                        e.preventDefault();
                        goTab(tab.id);
                      }}
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
                );
              })}
          </nav>
        )}
      </div>
    </div>
  );
}
