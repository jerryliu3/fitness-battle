"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { AppHeading } from "@/ui/section";
import { useRaceFavorites } from "./favorites";

const ReplayPlayer = dynamic(
  () => import("./replay/replay-player").then(m => m.ReplayPlayer),
  { ssr: false },
);

type ActiveTab = "observatory" | "replay";

type AuthPromptDetail = {
  action: "save" | "pin";
  target?: string;
};

function PaceShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { state } = useCompete();
  const saved = useRaceFavorites();

  const isReplayRoute = pathname.includes("/pace/replay");
  const isSubPage =
    pathname.includes("/pace/saved") ||
    pathname.includes("/pace/coverage") ||
    pathname.includes("/pace/compare") ||
    pathname.includes("/pace/history") ||
    pathname.includes("/pace/search") ||
    pathname.includes("/pace/trends") ||
    pathname.includes("/pace/result/") ||
    pathname.includes("/pace/athlete/");

  const [activeTab, setActiveTab] = useState<ActiveTab>(isReplayRoute ? "replay" : "observatory");
  const [replayVisited, setReplayVisited] = useState<boolean>(isReplayRoute);
  const [authPrompt, setAuthPrompt] = useState<AuthPromptDetail | null>(null);

  useEffect(() => {
    if (isReplayRoute) {
      setActiveTab("replay");
      setReplayVisited(true);
    } else if (!isSubPage) {
      setActiveTab("observatory");
    }
  }, [isReplayRoute, isSubPage]);

  // Listen for custom in-memory tab switch requests from RaceExplorer cards ("▶")
  const [replayScopeOverride, setReplayScopeOverride] = useState<{
    edition: string;
    distance: string;
    sex: string;
    clock: string;
    ids: string;
  } | null>(null);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ edition?: string; distance?: string; sex?: string; clock?: string; ids?: string }>).detail;
      if (detail) {
        setReplayScopeOverride({
          edition: detail.edition || searchParams.get("edition") || "6",
          distance: detail.distance || searchParams.get("distance") || "marathon",
          sex: detail.sex || searchParams.get("sex") || "all",
          clock: detail.clock || "chip",
          ids: detail.ids || "",
        });
      }
      setReplayVisited(true);
      setActiveTab("replay");
    };
    window.addEventListener("ovt:open-replay", handler);
    return () => window.removeEventListener("ovt:open-replay", handler);
  }, [searchParams]);

  // Listen for signed-out Save / Pin account creation prompts
  useEffect(() => {
    const onRequireAuth = (ev: Event) => {
      const detail = (ev as CustomEvent<AuthPromptDetail>).detail ?? { action: "save" };
      setAuthPrompt(detail);
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setAuthPrompt(null);
    };
    window.addEventListener("ovt:require-auth", onRequireAuth);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("ovt:require-auth", onRequireAuth);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const distance =
    replayScopeOverride?.distance ||
    searchParams.get("distance") ||
    pathname.match(/\/pace\/(5k|10k|half-marathon|marathon)/)?.[1] ||
    "marathon";
  const edition = replayScopeOverride?.edition || searchParams.get("edition") || "6";
  const sex = replayScopeOverride?.sex || searchParams.get("sex") || "all";
  const clock = replayScopeOverride?.clock || searchParams.get("clock") || "chip";
  const ids = replayScopeOverride?.ids ?? searchParams.get("ids") ?? "";

  const isSaved = pathname.includes("/pace/saved");
  const displayName = state?.name || user?.displayName || (user?.email ? user.email.split("@")[0] : null);
  const savedCount = user && saved.ready ? saved.ids.length : 0;

  function switchTab(target: ActiveTab) {
    if (target === "replay") setReplayVisited(true);
    if (isSubPage || (isReplayRoute && target === "observatory")) {
      const q = new URLSearchParams({ distance });
      if (edition) q.set("edition", edition);
      if (sex && sex !== "all") q.set("sex", sex);
      router.push(target === "replay" ? `/pace/replay?${q}` : `/pace?${q}`);
      return;
    }
    setActiveTab(target);
  }

  return (
    <div className="rankings-shell ovt-shell">
      <header className="ovt-mast">
        <div className="ovt-brand-group">
          <button
            type="button"
            className="ovt-brand"
            onClick={() => switchTab("observatory")}
          >
            <span className="ovt-brandmark" aria-hidden="true">↗</span>
            <span>overtaek</span>
          </button>
        </div>

        <nav className="ovt-topnav" aria-label="Overview and Replay destinations">
          <button
            type="button"
            className={`ovt-nav-tab ${!isSubPage && activeTab === "observatory" ? "active" : ""}`}
            aria-current={!isSubPage && activeTab === "observatory" ? "page" : undefined}
            onClick={() => switchTab("observatory")}
          >
            Overview
          </button>
          <button
            type="button"
            className={`ovt-nav-tab ${!isSubPage && activeTab === "replay" ? "active" : ""}`}
            aria-current={!isSubPage && activeTab === "replay" ? "page" : undefined}
            onClick={() => switchTab("replay")}
          >
            ▶ Replay Studio
          </button>
        </nav>

        <div className="ovt-mast-right">
          {user ? (
            <Link
              href="/pace/saved"
              className={`ovt-util-pill ${isSaved ? "active" : ""}`}
              title="Saved results and comparisons"
            >
              {savedCount > 0 ? `★ Saved (${savedCount})` : "☆ Saved"}
            </Link>
          ) : (
            <button
              type="button"
              className="ovt-util-pill"
              title="Save races and athlete finishes"
              onClick={() => setAuthPrompt({ action: "save", target: "your saved results list" })}
            >
              ☆ Saved
            </button>
          )}
          {user && (
            <Link href="/you" className="ovt-account on" title="Your athlete profile">
              ✦ {displayName || "Athlete"}
            </Link>
          )}
        </div>
      </header>

      <div className="ovt-page">
        {/* Keep Observatory and Replay Studio mounted in memory so toggling is instant */}
        {isSubPage ? (
          children
        ) : (
          <>
            <div
              className="ovt-tab-pane"
              style={{ display: activeTab === "observatory" ? "block" : "none" }}
              aria-hidden={activeTab !== "observatory"}
            >
              {!isReplayRoute ? children : null}
            </div>
            {(replayVisited || isReplayRoute) && (
              <div
                className="ovt-tab-pane"
                style={{ display: activeTab === "replay" ? "block" : "none" }}
                aria-hidden={activeTab !== "replay"}
              >
                {isReplayRoute ? (
                  children
                ) : (
                  <main className="rankings-wrap ovt-replay-main">
                    <div className="ovt-heading">
                      <div>
                        <span className="ovt-kicker">REPLAY STUDIO</span>
                        <AppHeading level={1} role="display">Watch the field unfold.</AppHeading>
                      </div>
                    </div>
                    <ReplayPlayer
                      active={activeTab === "replay"}
                      scope={{
                        edition: String(edition || "6"),
                        distance,
                        sex,
                        clock,
                      }}
                      initialIds={ids}
                    />
                  </main>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Account Creation Popup Modal for Signed-Out Save / Pin */}
      {authPrompt && (
        <div
          className="ovt-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ovt-auth-modal-title"
          onClick={e => {
            if (e.target === e.currentTarget) setAuthPrompt(null);
          }}
        >
          <div className="ovt-modal ovt-auth-modal">
            <div className="ovt-modal-head">
              <div>
                <span className="ovt-kicker">
                  {authPrompt.action === "pin" ? "PIN TO OVERVIEW" : "SAVE TO OVERTAEK"}
                </span>
                <AppHeading id="ovt-auth-modal-title" level={2} role="heading">
                  {authPrompt.action === "pin"
                    ? "Pin athletes & track your place on the curve."
                    : "Save races & finishes to your watchlist."}
                </AppHeading>
              </div>
              <button
                type="button"
                className="ovt-btn"
                onClick={() => setAuthPrompt(null)}
                aria-label="Close account prompt"
              >
                ✕
              </button>
            </div>

            <p className="ovt-auth-lead">
              Create a free Overtaek account to unlock{" "}
              {authPrompt.target ? <b>{authPrompt.target}</b> : authPrompt.action === "pin" ? "pinned chart comparisons" : "saved finishes and race watchlists"}{" "}
              across Overview and Replay Studio.
            </p>

            <ul className="ovt-auth-perks">
              <li>
                <span>📌</span>
                <div>
                  <b>Pin athletes to the distribution chart</b>
                  <small>Benchmark any finisher or your own PR against 186,000+ marathon results.</small>
                </div>
              </li>
              <li>
                <span>★</span>
                <div>
                  <b>Save race editions &amp; build your replay watchlist</b>
                  <small>Bookmark athletes and jump straight into head-to-head course replays.</small>
                </div>
              </li>
              <li>
                <span>↗</span>
                <div>
                  <b>Overlay your personal Strava &amp; Overtaek efforts</b>
                  <small>See your exact percentile against every major marathon field.</small>
                </div>
              </li>
            </ul>

            <div className="ovt-auth-actions">
              <Link
                href={`/signup?next=${encodeURIComponent(pathname || "/app/pace")}`}
                className="ovt-btn gold ovt-auth-cta"
                onClick={() => setAuthPrompt(null)}
              >
                Create free account →
              </Link>
              <Link
                href={`/login?next=${encodeURIComponent(pathname || "/app/pace")}`}
                className="ovt-btn ovt-auth-cta"
                onClick={() => setAuthPrompt(null)}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PaceShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="rankings-shell ovt-shell">
          <header className="ovt-mast">
            <div className="ovt-brand-group">
              <span className="ovt-brand">
                <span className="ovt-brandmark" aria-hidden="true">↗</span>
                <span>overtaek</span>
              </span>
            </div>
          </header>
          <div className="ovt-page">{children}</div>
        </div>
      }
    >
      <PaceShellInner>{children}</PaceShellInner>
    </Suspense>
  );
}
