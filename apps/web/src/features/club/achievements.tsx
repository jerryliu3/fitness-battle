"use client";
import { Section, TextAction, AppText, typographyStyle } from "@/ui/section";
import { useState } from "react";
import {
  athleteMomentumModel,
  competeNow,
  type CompeteState,
  type MomentumRingModel,
} from "@fitness-battle/shared";

const RING_COLORS: Record<MomentumRingModel["accent"], string> = {
  gold: "#f7c948",
  teal: "#176c75",
  ink: "#142b3b",
  amber: "#dfad3c",
};

export function Achievements({ state }: { state: CompeteState }) {
  const now = competeNow(state);
  const momentum = athleteMomentumModel(state, now);
  const [selectedId, setSelectedId] = useState<string>("streak");

  const inspectedRing = momentum.rings.find((r) => r.id === selectedId);
  const inspectedBento = momentum.bentoCards.find((b) => b.id === selectedId);
  const inspected = inspectedRing ?? inspectedBento ?? momentum.rings[0]!;

  return (
    <Section
      className="club-achievements"
      title="Momentum & milestones"
      action={
        <TextAction
          href="/you/achievements"
          label="View all"
          accessibilityLabel="View all achievements"
        />
      }
    >
      <div style={{ display: "grid", gap: 12 }}>
        {/* 4 LIVE MOMENTUM RINGS CARD */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e3e9e7",
            borderRadius: 20,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <strong style={{ ...typographyStyle("label"), color: "#142b3b" }}>
                Live Milestone Rings
              </strong>
              <AppText role="caption" secondary>
                Every counted workout advances all 4 career rings
              </AppText>
            </div>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "#fff5d1",
                color: "#142b3b",
                ...typographyStyle("caption"),
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {momentum.activeRingCount} Active
            </span>
          </div>

          <div
            role="group"
            aria-label="Live milestone rings"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {momentum.rings.map((ring) => {
              const active = selectedId === ring.id;
              const dash = Math.round(ring.fraction * 138.2);
              const stroke = RING_COLORS[ring.accent];
              return (
                <button
                  key={ring.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${ring.label}: ${ring.metricLabel}, ${ring.percent}%`}
                  onClick={() => setSelectedId(ring.id)}
                  style={{
                    padding: "10px 6px",
                    borderRadius: 16,
                    border: `1.5px solid ${active ? "#142b3b" : "#e3e9e7"}`,
                    background: active ? "#fffdf5" : "#f8f9f6",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    textAlign: "center",
                  }}
                >
                  <svg
                    width="54"
                    height="54"
                    viewBox="0 0 56 56"
                    aria-hidden="true"
                  >
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
                      stroke="#e3e9e7"
                      strokeWidth="5"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
                      stroke={stroke}
                      strokeWidth="5"
                      strokeDasharray={`${dash} 138.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)"
                    />
                    <text
                      x="28"
                      y="32"
                      textAnchor="middle"
                      fill="#142b3b"
                      fontSize="11"
                      fontWeight="800"
                    >
                      {ring.percent}%
                    </text>
                  </svg>
                  <strong
                    style={{
                      ...typographyStyle("caption"),
                      color: "#142b3b",
                      fontWeight: 800,
                    }}
                  >
                    {ring.label}
                  </strong>
                  <span
                    style={{
                      ...typographyStyle("caption"),
                      color: "#637482",
                    }}
                  >
                    {ring.valueLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 BREAKTHROUGH BENTO WALL CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {momentum.bentoCards.map((card) => {
            const active = selectedId === card.id;
            const isDark = card.tone === "dark";
            return (
              <button
                key={card.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(card.id)}
                style={{
                  padding: 14,
                  borderRadius: 20,
                  border: isDark
                    ? `1.5px solid ${active ? "#f7c948" : "#243c4e"}`
                    : `1.5px solid ${active ? "#142b3b" : "#f7c948"}`,
                  background: isDark
                    ? "linear-gradient(155deg, #142b3b 0%, #0d1f2d 100%)"
                    : "#fff5d1",
                  color: isDark ? "#ffffff" : "#142b3b",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 6,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: isDark ? "#f7c948" : "#142b3b",
                    color: isDark ? "#142b3b" : "#ffffff",
                    ...typographyStyle("caption"),
                    fontWeight: 800,
                  }}
                >
                  {card.badge}
                </span>
                <strong
                  style={{
                    ...typographyStyle("heading"),
                    color: isDark ? "#ffffff" : "#142b3b",
                    marginTop: 2,
                  }}
                >
                  {card.value}
                </strong>
                <span
                  style={{
                    ...typographyStyle("caption"),
                    color: isDark ? "#7fd8ce" : "#176c75",
                    fontWeight: 700,
                  }}
                >
                  {card.delta}
                </span>
                <span
                  style={{
                    ...typographyStyle("caption"),
                    color: isDark ? "#c9d6e3" : "#637482",
                  }}
                >
                  {card.caption}
                </span>
              </button>
            );
          })}
        </div>

        {/* INTERACTIVE PROVENANCE & NEXT-TIER RECEIPT DRAWER */}
        <div
          role="region"
          aria-live="polite"
          aria-label="Selected milestone details"
          style={{
            padding: 16,
            borderRadius: 20,
            background: "#142b3b",
            border: "1px solid #294356",
            color: "#ffffff",
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: 999,
                  background: inspected.earned
                    ? "#f7c948"
                    : "rgba(255, 255, 255, 0.14)",
                  color: inspected.earned ? "#142b3b" : "#c9d6e3",
                  ...typographyStyle("caption"),
                  fontWeight: 700,
                }}
              >
                {inspected.earned ? "Unlocked" : "In Pursuit"}
              </span>
              <span style={{ ...typographyStyle("caption"), color: "#c9d6e3" }}>
                {inspected.tierLabel}
              </span>
            </div>
            {"metricLabel" in inspected ? (
              <strong style={{ ...typographyStyle("caption"), color: "#f7c948" }}>
                {inspected.metricLabel}
              </strong>
            ) : (
              <strong style={{ ...typographyStyle("caption"), color: "#f7c948" }}>
                {inspected.dateLabel}
              </strong>
            )}
          </div>

          <div style={{ display: "grid", gap: 2 }}>
            <strong style={{ ...typographyStyle("label"), color: "#ffffff" }}>
              {inspected.title}
            </strong>
            <span style={{ ...typographyStyle("caption"), color: "#c9d6e3" }}>
              {inspected.subtitle}
            </span>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.08)",
              display: "grid",
              gap: 4,
            }}
          >
            <span style={{ ...typographyStyle("caption"), color: "#ffffff" }}>
              {inspected.receipt}
            </span>
            <strong style={{ ...typographyStyle("caption"), color: "#7fd8ce" }}>
              Next: {inspected.nextTierLabel}
            </strong>
          </div>
        </div>
      </div>
    </Section>
  );
}

