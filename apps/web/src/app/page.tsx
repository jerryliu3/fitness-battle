"use client";

import {
  DEMO_BATTLES,
  DEMO_CATEGORIES,
  demoStandings,
  weeklyPeriodBounds,
  type Battle,
  type BattleMode,
  type CategorySlug,
  type StandingRow,
} from "@fitness-battle/shared";
import { useMemo, useState, type CSSProperties } from "react";

type Tab = "home" | "join" | "standings" | "tracker";

function formatScore(score: number, unit: string) {
  if (unit === "reps") return `${Math.round(score)} reps`;
  if (score >= 1000) return `${(score / 1000).toFixed(1)} km`;
  return `${Math.round(score)} m`;
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("home");
  const [battles, setBattles] = useState<Battle[]>(DEMO_BATTLES);
  const [selectedCategory, setSelectedCategory] =
    useState<CategorySlug>("running");
  const [selectedBattleId, setSelectedBattleId] = useState(
    DEMO_BATTLES[0]?.id ?? "",
  );
  const [inviteCode, setInviteCode] = useState("");
  const [standings, setStandings] = useState<StandingRow[]>(demoStandings());
  const [trackerMessage, setTrackerMessage] = useState(
    "Connect a tracker to auto-score battles.",
  );
  const [trackerStatus, setTrackerStatus] = useState("disconnected");
  const [syncSummary, setSyncSummary] = useState("");

  const period = useMemo(() => weeklyPeriodBounds(), []);
  const battle = battles.find((b) => b.id === selectedBattleId);
  const unit =
    DEMO_CATEGORIES.find((c) => c.slug === selectedCategory)?.unit ?? "meters";

  function joinBattle(mode: BattleMode) {
    const code =
      inviteCode.trim().toUpperCase() ||
      (mode === "one_v_one" ? "DUEL01" : "SUNRISE");
    const existing = battles.find(
      (b) => b.inviteCode.toUpperCase() === code,
    );
    if (existing) {
      setSelectedBattleId(existing.id);
      setStandings(demoStandings());
      setTab("standings");
      return;
    }
    const category = DEMO_CATEGORIES.find((c) => c.slug === selectedCategory);
    const created: Battle = {
      id: `battle-${Date.now()}`,
      name: mode === "one_v_one" ? "Quick Duel" : "Pickup Pack",
      mode,
      categoryId: category?.id ?? "cat-running",
      categorySlug: selectedCategory,
      periodKind: "weekly",
      status: "active",
      inviteCode: code,
      createdBy: "demo-user",
      createdAt: new Date().toISOString(),
    };
    setBattles((prev) => [created, ...prev]);
    setSelectedBattleId(created.id);
    setStandings(demoStandings());
    setTab("standings");
  }

  async function connectTracker() {
    const res = await fetch("/api/fitness/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "demo-user" }),
    });
    const data = (await res.json()) as {
      message: string;
      status: string;
      authorizeUrl?: string;
    };
    setTrackerMessage(data.message);
    setTrackerStatus(data.status);
    if (data.authorizeUrl) {
      window.location.href = data.authorizeUrl;
    }
  }

  async function syncTracker() {
    const res = await fetch("/api/fitness/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: "demo-user",
        categorySlug: selectedCategory,
      }),
    });
    const data = (await res.json()) as {
      activities: { metricValue: number }[];
      usedMock: boolean;
    };
    const total = data.activities.reduce((s, a) => s + a.metricValue, 0);
    setSyncSummary(
      data.usedMock
        ? `Stub sync: ${data.activities.length} activities (~${Math.round(total)} units).`
        : `Synced ${data.activities.length} activities.`,
    );
  }

  return (
    <main style={styles.main}>
      <header style={styles.brandBlock}>
        <h1 style={styles.brand}>Fitness Battle</h1>
        <p style={styles.tagline}>
          One tap. Join the pack. Let your tracker keep score.
        </p>
      </header>

      <nav style={styles.nav}>
        {(
          [
            ["home", "Home"],
            ["join", "Join"],
            ["standings", "Standings"],
            ["tracker", "Tracker"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              ...styles.navBtn,
              borderBottomColor: tab === id ? "var(--lime)" : "transparent",
              color: tab === id ? "var(--mist)" : "var(--fog)",
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "home" && (
        <section style={styles.section}>
          <h2 style={styles.h2}>Your battles</h2>
          <p style={styles.copy}>
            Weekly standings reset Mondays (UTC). Periods can go daily,
            monthly, or custom later.
          </p>
          {battles.map((item) => (
            <button
              key={item.id}
              type="button"
              style={styles.battleRow}
              onClick={() => {
                setSelectedBattleId(item.id);
                setStandings(demoStandings());
                setTab("standings");
              }}
            >
              <span>
                <strong style={{ display: "block" }}>{item.name}</strong>
                <span style={styles.meta}>
                  {item.mode === "one_v_one" ? "1v1" : "Group"} ·{" "}
                  {item.categorySlug} · {item.periodKind}
                </span>
              </span>
              <span style={styles.code}>{item.inviteCode}</span>
            </button>
          ))}
          <button
            type="button"
            style={styles.primary}
            onClick={() => setTab("join")}
          >
            Join a battle
          </button>
        </section>
      )}

      {tab === "join" && (
        <section style={styles.section}>
          <h2 style={styles.h2}>Join in one tap</h2>
          <p style={styles.copy}>
            Pick a category, choose group or 1v1, then jump in.
          </p>
          <div style={styles.chips}>
            {DEMO_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                style={{
                  ...styles.chip,
                  background:
                    selectedCategory === cat.slug
                      ? "var(--lime)"
                      : "var(--asphalt)",
                  color:
                    selectedCategory === cat.slug
                      ? "var(--ink)"
                      : "var(--mist)",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <label style={styles.label}>
            Invite code (optional)
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="SUNRISE"
              style={styles.input}
            />
          </label>
          <button
            type="button"
            style={styles.primary}
            onClick={() => joinBattle("group")}
          >
            Join group
          </button>
          <button
            type="button"
            style={styles.secondary}
            onClick={() => joinBattle("one_v_one")}
          >
            Join 1v1
          </button>
        </section>
      )}

      {tab === "standings" && (
        <section style={styles.section}>
          <h2 style={styles.h2}>{battle?.name ?? "Standings"}</h2>
          <p style={styles.copy}>
            Current {battle?.periodKind ?? "weekly"} period ·{" "}
            {period.startsAt.toISOString().slice(0, 10)} →{" "}
            {period.endsAt.toISOString().slice(0, 10)}
          </p>
          {standings.map((row) => (
            <div
              key={row.userId}
              style={{
                ...styles.standing,
                background: row.isViewer
                  ? "rgba(198, 241, 53, 0.08)"
                  : "transparent",
              }}
            >
              <span style={styles.rank}>#{row.rank}</span>
              <span style={{ flex: 1 }}>
                {row.displayName}
                {row.isViewer ? " · you" : ""}
              </span>
              <strong>{formatScore(row.score, unit)}</strong>
            </div>
          ))}
        </section>
      )}

      {tab === "tracker" && (
        <section style={styles.section}>
          <h2 style={styles.h2}>Fitness tracker</h2>
          <p style={styles.copy}>
            Strava is the default cloud provider. Without OAuth keys the API
            stubs connect + sync with mock activities.
          </p>
          <div style={styles.status}>
            <div style={styles.statusLabel}>Status</div>
            <div style={{ fontWeight: 700, textTransform: "capitalize" }}>
              {trackerStatus} · strava
            </div>
            <p style={styles.copy}>{trackerMessage}</p>
            {syncSummary ? (
              <p style={{ color: "var(--lime)", margin: 0 }}>{syncSummary}</p>
            ) : null}
          </div>
          <button type="button" style={styles.primary} onClick={connectTracker}>
            Connect Strava
          </button>
          <button type="button" style={styles.secondary} onClick={syncTracker}>
            Sync activities
          </button>
        </section>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "24px 20px 48px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    minHeight: "100vh",
  },
  brandBlock: { display: "grid", gap: 8, marginTop: 8 },
  brand: {
    fontFamily: "var(--font-display), Bebas Neue, sans-serif",
    fontSize: "clamp(48px, 12vw, 64px)",
    lineHeight: 0.95,
    margin: 0,
    letterSpacing: 1,
  },
  tagline: {
    margin: 0,
    color: "var(--fog)",
    fontSize: 16,
    lineHeight: 1.4,
    maxWidth: 320,
  },
  nav: { display: "flex", flexWrap: "wrap", gap: 8 },
  navBtn: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "8px 12px",
    cursor: "pointer",
  },
  section: { display: "grid", gap: 12 },
  h2: {
    fontFamily: "var(--font-display), Bebas Neue, sans-serif",
    fontSize: 34,
    margin: 0,
    letterSpacing: 0.5,
  },
  copy: { margin: 0, color: "var(--fog)", lineHeight: 1.45 },
  battleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderTop: "1px solid var(--line)",
    color: "var(--mist)",
    padding: "14px 0",
    cursor: "pointer",
  },
  meta: {
    display: "block",
    color: "var(--fog)",
    fontSize: 13,
    marginTop: 2,
    textTransform: "capitalize",
  },
  code: { color: "var(--lime)", letterSpacing: 1, fontSize: 13 },
  primary: {
    marginTop: 4,
    background: "var(--lime)",
    color: "var(--ink)",
    border: "none",
    padding: "16px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondary: {
    background: "transparent",
    color: "var(--lime)",
    border: "1px solid var(--lime-dim)",
    padding: "16px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: {
    border: "none",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 500,
  },
  label: {
    display: "grid",
    gap: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  input: {
    background: "var(--asphalt)",
    border: "none",
    color: "var(--mist)",
    padding: "14px",
    letterSpacing: 2,
  },
  standing: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 8px",
    borderTop: "1px solid var(--line)",
  },
  rank: {
    fontFamily: "var(--font-display), Bebas Neue, sans-serif",
    fontSize: 28,
    color: "var(--lime)",
    width: 48,
  },
  status: {
    background: "var(--asphalt)",
    padding: 16,
    display: "grid",
    gap: 6,
  },
  statusLabel: {
    color: "var(--fog)",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
};
