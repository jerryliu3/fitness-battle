"use client";

import { useState } from "react";
import { Sheet } from "@/ui/sheet";
import { AppParagraph, AppText } from "@/ui/section";
import { ENTRY_PASS_PLANS } from "@fitness-battle/shared";
import { CompeteIcon } from "./event-home";

export function EntryPassSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [selectedPlanKey, setSelectedPlanKey] = useState<"annual" | "monthly" | "lifetime">("annual");
  const selectedPlan = ENTRY_PASS_PLANS[selectedPlanKey];

  return (
    <Sheet
      open={open}
      title="Entry Pass"
      body="Compete weekly across running, cycling, walking, strength and sleep meets."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: "20px", paddingTop: "8px", paddingBottom: "16px" }}>
        {/* Value Propositions */}
        <div style={{ display: "grid", gap: "12px", padding: "16px", borderRadius: "18px", border: "1px solid var(--line)", background: "var(--card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ display: "inline-flex", padding: "8px", borderRadius: "12px", background: "rgba(183, 242, 85, 0.15)" }}>
              <CompeteIcon name="trophy" size={20} />
            </span>
            <div>
              <AppText role="label">Multi-Sport Competition</AppText>
              <AppParagraph typographyRole="caption" className="ui-text-secondary">
                Enter running, cycling, walking, and strength meets in the same week.
              </AppParagraph>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ display: "inline-flex", padding: "8px", borderRadius: "12px", background: "rgba(183, 242, 85, 0.15)" }}>
              <CompeteIcon name="sleep" size={20} />
            </span>
            <div>
              <AppText role="label">Sleep & Recovery Meets</AppText>
              <AppParagraph typographyRole="caption" className="ui-text-secondary">
                Count sleep consistency and recovery alongside your athletic training.
              </AppParagraph>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ display: "inline-flex", padding: "8px", borderRadius: "12px", background: "rgba(183, 242, 85, 0.15)" }}>
              <CompeteIcon name="wreath" size={20} gold />
            </span>
            <div>
              <AppText role="label">Matched 8-Athlete Fields</AppText>
              <AppParagraph typographyRole="caption" className="ui-text-secondary">
                Climb Elo divisions with live splits, Sunday finishes, and overtake alerts.
              </AppParagraph>
            </div>
          </div>
        </div>

        {/* Plan Selectors */}
        <div style={{ display: "grid", gap: "10px" }}>
          {(["annual", "monthly", "lifetime"] as const).map((key) => {
            const plan = ENTRY_PASS_PLANS[key];
            const isSelected = selectedPlanKey === key;

            return (
              <div
                key={plan.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => setSelectedPlanKey(key)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") setSelectedPlanKey(key);
                }}
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  border: isSelected ? "1.5px solid var(--ink)" : "1.5px solid var(--line)",
                  background: isSelected ? "rgba(183, 242, 85, 0.12)" : "var(--card)",
                  cursor: "pointer",
                  display: "grid",
                  gap: "4px",
                  transition: "border-color 0.15s ease, background-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <AppText role="heading">{plan.title}</AppText>
                    {Boolean(plan.badge) && (
                      <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px", background: "var(--ink)", color: "var(--paper)" }}>
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <AppText role="display">{plan.priceDisplay}</AppText>
                </div>
                <AppParagraph typographyRole="caption" className="ui-text-secondary">
                  {plan.description}
                </AppParagraph>
              </div>
            );
          })}
        </div>

        {/* Mobile App Activation Callout */}
        <div style={{ display: "grid", gap: "12px", textAlign: "center" }}>
          <div style={{ padding: "14px", borderRadius: "14px", background: "var(--card)", border: "1px solid var(--line)", display: "grid", gap: "6px" }}>
            <AppText role="label">Activate in the Overtaek Mobile App</AppText>
            <AppParagraph typographyRole="caption" className="ui-text-secondary">
              In-app purchases are managed through the Apple App Store and Google Play Store. Open Overtaek on your mobile device to start your {selectedPlan.title} ({selectedPlan.priceDisplay}).
            </AppParagraph>
          </div>
          <button type="button" className="fb-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </Sheet>
  );
}
