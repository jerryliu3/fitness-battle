"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { SHELL_TABS, shellTabFromPath, type ShellTabId } from "@fitness-battle/shared";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import "./shell.css";

export function PhoneShell({
  children,
  hideTabs = false,
}: {
  children: ReactNode;
  hideTabs?: boolean;
}) {
  const path = usePathname();
  const reduce = useReducedMotion();
  const { user, loading } = useAuth();
  const { saveError, legacyOffer, loadStatus, recoverLegacy, retryLoad } = useCompete();
  const [pressed, setPressed] = useState<ShellTabId | null>(null);
  const matched = shellTabFromPath(path)?.id ?? null;
  const active = pressed ?? matched;

  useEffect(() => {
    setPressed(null);
  }, [path]);

  return (
    <div className="phone-frame">
      <div className="phone-shell">
        <ScrollArea.Root className="phone-scroll" type="scroll">
          <ScrollArea.Viewport>
            <div className={hideTabs ? "phone-main phone-main-solo" : "phone-main"}>
              {!hideTabs && saveError ? <p className="phone-guest">{saveError}</p> : null}
              {!hideTabs && legacyOffer ? (
                <p className="phone-guest">
                  This browser still has history from before accounts.{" "}
                  <button type="button" className="fb-btn-ghost" onClick={recoverLegacy}>
                    Use it on this account
                  </button>
                </p>
              ) : null}
              {!hideTabs && loadStatus === "failed" ? (
                <p className="phone-guest">
                  Could not load the account copy. This screen is read-only.{" "}
                  <button type="button" className="fb-btn-ghost" onClick={retryLoad}>
                    Retry
                  </button>
                </p>
              ) : null}
              {!hideTabs && !loading && !user ? (
                <p className="phone-guest">
                  Browsing as a guest. <Link href="/signup">Create an account</Link>
                </p>
              ) : null}
              {children}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
        {hideTabs ? null : (
          <Tabs.Root
            value={active ?? ""}
            onValueChange={(value) => {
              if (value === "today" || value === "arena" || value === "field" || value === "you") {
                setPressed(value);
              }
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
                            reduce ? { duration: 0 } : { type: "spring", bounce: 0.18, duration: 0.35 }
                          }
                        />
                      ) : null}
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
