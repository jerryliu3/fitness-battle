"use client";

import { useState } from "react";
import type { CrewActivityFeedItem, CrewDetails, CrewMember } from "@fitness-battle/shared";
import {
  PROTOTYPE_CREW_DETAILS,
  PROTOTYPE_CREW_MEMBERS,
  PROTOTYPE_CREW_FEED,
} from "@fitness-battle/shared";
import { CrewNudgeModal } from "../modals/crew-nudge-modal";
import { CrewManageModal } from "../modals/crew-manage-modal";

export type CrewVariant = "clubhouse" | "syndicate" | "stories" | "battleground" | "ledger";

interface Props {
  variant?: CrewVariant;
  onVariantChange?: (variant: CrewVariant) => void;
}

export function CrewRedesign({ variant = "clubhouse", onVariantChange }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<CrewVariant>(variant);
  const [feed, setFeed] = useState<CrewActivityFeedItem[]>(PROTOTYPE_CREW_FEED);
  const [crew, setCrew] = useState<CrewDetails>(PROTOTYPE_CREW_DETAILS);
  const [members, setMembers] = useState<CrewMember[]>(PROTOTYPE_CREW_MEMBERS);
  const [nudgeTarget, setNudgeTarget] = useState<CrewMember | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"feed" | "leaderboard">("feed");

  const activeVariant = onVariantChange ? variant : selectedVariant;

  function handleVariantSwitch(v: CrewVariant) {
    if (onVariantChange) onVariantChange(v);
    else setSelectedVariant(v);
  }

  function handleCheer(feedId: string) {
    setFeed((prev) =>
      prev.map((item) => {
        if (item.id === feedId) {
          const userCheered = !item.userCheered;
          return {
            ...item,
            userCheered,
            cheersCount: userCheered ? item.cheersCount + 1 : item.cheersCount - 1,
          };
        }
        return item;
      }),
    );
  }

  function handleSendNudge(memberName: string, message: string) {
    // Add temporary activity item for the nudge in feed
    const newFeedItem: CrewActivityFeedItem = {
      id: `nudge-${Date.now()}`,
      memberId: "you",
      memberName: "You (Jerry Liu)",
      avatarSeed: "jerry",
      sportId: "running",
      sportName: "Crew Motivation",
      timestamp: "Just now",
      title: `⚡ Nudged ${memberName}: "${message.slice(0, 30)}..."`,
      distanceOrDuration: "Push Alert",
      cheersCount: 1,
      nudgesCount: 1,
      userCheered: true,
    };
    setFeed([newFeedItem, ...feed]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Variant Switcher Control */}
      <div className="rd-variant-selector-wrap">
        <div className="rd-variant-label">
          <span>Crew Layout Design</span>
          <span className="rd-variant-name">
            {activeVariant === "clubhouse" && "1. Social Clubhouse & Feed"}
            {activeVariant === "syndicate" && "2. Tactical Syndicate & Mission"}
            {activeVariant === "stories" && "3. Stories Stream & Cheer Reel"}
            {activeVariant === "battleground" && "4. Co-Op Battleground"}
            {activeVariant === "ledger" && "5. Minimalist Squad Ledger"}
          </span>
        </div>
        <div className="rd-variant-pills">
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "clubhouse" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("clubhouse")}
          >
            Clubhouse
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "syndicate" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("syndicate")}
          >
            Syndicate
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "stories" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("stories")}
          >
            Stories
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "battleground" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("battleground")}
          >
            Battle
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "ledger" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("ledger")}
          >
            Ledger
          </button>
        </div>
      </div>

      {/* Crew Hero Banner */}
      <div className="rd-crew-hero">
        <div className="rd-crew-hero-top">
          <div className="rd-crew-name-tag">
            <h2 className="rd-crew-title">{crew.name}</h2>
            <span className="rd-crew-badge">[{crew.tag}]</span>
          </div>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ⚙️ Manage
          </button>
        </div>
        <p className="rd-crew-motto">"{crew.motto}"</p>

        <div className="rd-crew-stats-bar">
          <div>
            <span className="rd-crew-stat-num">#{crew.rank}</span>
            <span className="rd-crew-stat-label">Global Rank</span>
          </div>
          <div>
            <span className="rd-crew-stat-num">{crew.weeklyCurrentKm} km</span>
            <span className="rd-crew-stat-label">Weekly Vol</span>
          </div>
          <div>
            <span className="rd-crew-stat-num">{crew.totalMembers} / {crew.maxMembers}</span>
            <span className="rd-crew-stat-label">Athletes</span>
          </div>
        </div>
      </div>

      {/* Teammate Nudge Strip: Tap to Nudge */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink, #12141a)", textTransform: "uppercase" }}>
            Teammates & Nudge Radar
          </span>
          <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Tap avatar to nudge</span>
        </div>
        <div className="rd-nudge-strip">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              className="rd-nudge-item"
              onClick={() => setNudgeTarget(member)}
              aria-label={`Nudge ${member.name}`}
            >
              <div className={`rd-nudge-avatar-ring is-${member.status}`}>
                <span style={{ fontSize: 12, fontWeight: 800 }}>
                  {member.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="rd-nudge-btn-overlay">⚡</span>
              </div>
              <span className="rd-nudge-name">{member.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toggle between Feed and Crew Leaderboard */}
      <div style={{ display: "flex", gap: 8, background: "var(--paper, #eef1f4)", padding: 4, borderRadius: 12 }}>
        <button
          type="button"
          onClick={() => setViewMode("feed")}
          style={{
            flex: 1,
            border: "none",
            borderRadius: 8,
            padding: "8px 0",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            background: viewMode === "feed" ? "var(--card, #ffffff)" : "transparent",
            color: viewMode === "feed" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
          }}
        >
          💬 Crew Social Feed ({feed.length})
        </button>
        <button
          type="button"
          onClick={() => setViewMode("leaderboard")}
          style={{
            flex: 1,
            border: "none",
            borderRadius: 8,
            padding: "8px 0",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            background: viewMode === "leaderboard" ? "var(--card, #ffffff)" : "transparent",
            color: viewMode === "leaderboard" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
          }}
        >
          🏆 Intra-Crew Leaderboard
        </button>
      </div>

      {/* View Mode: Crew Leaderboard */}
      {viewMode === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members
            .slice()
            .sort((a, b) => b.weeklyKm - a.weeklyKm)
            .map((m, idx) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: m.name.includes("You") ? "#f6fee7" : "var(--card, #ffffff)",
                  border: m.name.includes("You") ? "1px solid var(--lime, #b7f255)" : "1px solid var(--line, #dce1ea)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, width: 22, color: idx === 0 ? "#f59e0b" : "var(--muted, #5c6578)" }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>{m.name}</span>
                    <span style={{ fontSize: 10, color: "var(--muted, #5c6578)", display: "block" }}>
                      {m.role} · {m.streakDays}d streak · {m.lastActiveLabel}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                    {m.weeklyKm} km
                  </span>
                  <button
                    type="button"
                    onClick={() => setNudgeTarget(m)}
                    style={{
                      border: "none",
                      background: "var(--paper, #eef1f4)",
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ⚡ Nudge
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* View Mode: Feed */}
      {viewMode === "feed" && (
        <>
          {/* ==============================================================
              DESIGN 1: SOCIAL CLUBHOUSE FEED
              ============================================================== */}
          {activeVariant === "clubhouse" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {feed.map((post) => (
                <div key={post.id} className="rd-feed-card">
                  <div className="rd-feed-header">
                    <div className="rd-feed-user">
                      <div className="rd-athlete-avatar">
                        {post.memberName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>
                          {post.memberName}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted, #5c6578)", display: "block" }}>
                          {post.timestamp} · {post.sportName}
                        </span>
                      </div>
                    </div>
                    <span className="rd-feed-metric-badge">{post.distanceOrDuration}</span>
                  </div>

                  <p className="rd-feed-title">{post.title}</p>
                  {post.paceOrIntensity && (
                    <span style={{ fontSize: 12, color: "var(--muted, #5c6578)" }}>
                      Telemetry: {post.paceOrIntensity}
                    </span>
                  )}

                  <div className="rd-feed-actions">
                    <button
                      type="button"
                      className={`rd-feed-action-btn ${post.userCheered ? "is-active" : ""}`}
                      onClick={() => handleCheer(post.id)}
                    >
                      <span>🔥 High Five</span>
                      <span>({post.cheersCount})</span>
                    </button>
                    <button
                      type="button"
                      className="rd-feed-action-btn"
                      onClick={() => {
                        const member = members.find((m) => m.name === post.memberName);
                        if (member) setNudgeTarget(member);
                      }}
                    >
                      <span>⚡ Nudge Back</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==============================================================
              DESIGN 2: TACTICAL SYNDICATE ROSTER & MISSION BAR
              ============================================================== */}
          {activeVariant === "syndicate" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Mission Target Bar */}
              <div style={{ background: "var(--card, #ffffff)", border: "1px solid var(--line, #dce1ea)", borderRadius: 16, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Weekly Squad Mission (350 km)</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--lime-deep, #7ab800)" }}>
                    {((crew.weeklyCurrentKm / crew.weeklyGoalKm) * 100).toFixed(0)}% Complete
                  </span>
                </div>
                <div style={{ height: 10, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(crew.weeklyCurrentKm / crew.weeklyGoalKm) * 100}%`,
                      background: "var(--lime-deep, #7ab800)",
                    }}
                  />
                </div>
              </div>

              {/* Feed compact */}
              {feed.map((post) => (
                <div key={post.id} className="rd-feed-card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{post.memberName}</span>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>{post.distanceOrDuration}</span>
                  </div>
                  <p style={{ margin: "2px 0", fontSize: 12, color: "var(--muted, #5c6578)" }}>{post.title}</p>
                </div>
              ))}
            </div>
          )}

          {/* ==============================================================
              DESIGN 3: STORIES STREAM & CHEER REEL
              ============================================================== */}
          {activeVariant === "stories" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="button"
                className="rd-btn-secondary"
                style={{ width: "100%" }}
                onClick={() => {
                  const slacker = members.find((m) => m.status === "slacking");
                  if (slacker) setNudgeTarget(slacker);
                }}
              >
                <span>⚡ Nudge Inactive Teammates</span>
              </button>

              {feed.map((post) => (
                <div key={post.id} className="rd-feed-card" style={{ borderLeft: "4px solid var(--lime-deep, #7ab800)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)" }}>
                    {post.timestamp} · {post.sportName}
                  </span>
                  <p style={{ margin: "4px 0", fontSize: 14, fontWeight: 800 }}>{post.title}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{post.memberName} ({post.distanceOrDuration})</span>
                    <button
                      type="button"
                      onClick={() => handleCheer(post.id)}
                      style={{
                        border: "none",
                        background: post.userCheered ? "var(--lime, #b7f255)" : "var(--paper, #eef1f4)",
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🔥 Cheer ({post.cheersCount})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==============================================================
              DESIGN 4: CREW CO-OP BATTLEGROUND
              ============================================================== */}
          {activeVariant === "battleground" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Rival Matchup Card */}
              {crew.activeMatchup && (
                <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", color: "#ffffff", padding: 14, borderRadius: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 10, color: "#a5b4fc", textTransform: "uppercase", fontWeight: 700 }}>
                        Active Squad Matchup
                      </span>
                      <h4 style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800 }}>
                        {crew.name} vs {crew.activeMatchup.rivalCrewName}
                      </h4>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "var(--lime, #b7f255)" }}>
                      +{crew.activeMatchup.leadKm} km Lead
                    </span>
                  </div>
                </div>
              )}

              {/* Feed items */}
              {feed.map((post) => (
                <div key={post.id} className="rd-feed-card">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{post.memberName}</span>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{post.distanceOrDuration}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #5c6578)" }}>{post.title}</p>
                </div>
              ))}
            </div>
          )}

          {/* ==============================================================
              DESIGN 5: MINIMALIST SQUAD LEDGER
              ============================================================== */}
          {activeVariant === "ledger" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {feed.map((post) => (
                <div
                  key={post.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "var(--card, #ffffff)",
                    border: "1px solid var(--line, #dce1ea)",
                    borderRadius: 10,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, display: "block" }}>{post.memberName}</span>
                    <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>{post.title}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{post.distanceOrDuration}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pop-up: Nudge Modal */}
      <CrewNudgeModal
        open={nudgeTarget != null}
        member={nudgeTarget}
        onClose={() => setNudgeTarget(null)}
        onSendNudge={handleSendNudge}
      />

      {/* Pop-up: Crew Manage Modal */}
      <CrewManageModal
        open={manageOpen}
        crew={crew}
        members={members}
        onClose={() => setManageOpen(false)}
        onUpdateCrew={(name, motto) => {
          setCrew({ ...crew, name, motto });
        }}
      />
    </div>
  );
}
