import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import {
  ENTRY_PASS_PLANS,
  type EntryPassPlan,
} from "@fitness-battle/shared";
import { FocusButton, FocusSheet } from "../ui/focus";
import { AppText } from "../ui/section";
import { useThemeColors } from "../theme";
import { purchasesBridge } from "../lib/entry-pass";
import { CompeteIcon } from "./compete-home-sections";
import { LegalLinks } from "./legal-links";

export interface EntryPassSheetProps {
  open: boolean;
  onClose: () => void;
  onPurchased?: () => void;
}

export function EntryPassSheet({
  open,
  onClose,
  onPurchased,
}: EntryPassSheetProps) {
  const c = useThemeColors();
  const [selectedPlanKey, setSelectedPlanKey] = useState<"monthly" | "annual" | "lifetime">("annual");
  const [busy, setBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedPlan = ENTRY_PASS_PLANS[selectedPlanKey];

  const handlePurchase = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await purchasesBridge.purchasePlan(selectedPlan);
      if (result.success) {
        onPurchased?.();
        onClose();
      } else if (result.error && result.error !== "purchase_cancelled") {
        setFeedback(result.error);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setRestoreBusy(true);
    setFeedback(null);
    try {
      const result = await purchasesBridge.restorePurchases();
      if (result.success) {
        Alert.alert("Purchases Restored", "Your Entry Pass has been restored.");
        onPurchased?.();
        onClose();
      } else {
        setFeedback(result.error ?? "No previous purchases found.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setRestoreBusy(false);
    }
  };

  return (
    <FocusSheet
      open={open}
      title="Entry Pass"
      body="Compete weekly across running, cycling, walking, strength and sleep meets."
      onClose={onClose}
    >
      <View style={styles.container}>
        {/* Value Proposition List */}
        <View style={[styles.featuresCard, { backgroundColor: c.card, borderColor: c.line }]}>
          <View style={styles.featureRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${c.tennis}22` }]}>
              <CompeteIcon name="trophy" size={20} />
            </View>
            <View style={styles.featureText}>
              <AppText role="label">Multi-Sport Competition</AppText>
              <AppText role="caption" secondary>
                Enter running, cycling, walking and strength meets in the same week.
              </AppText>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${c.tennis}22` }]}>
              <CompeteIcon name="sleep" size={20} />
            </View>
            <View style={styles.featureText}>
              <AppText role="label">Sleep & Recovery Meets</AppText>
              <AppText role="caption" secondary>
                Count sleep consistency and recovery alongside your training.
              </AppText>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${c.tennis}22` }]}>
              <CompeteIcon name="wreath" size={20} gold />
            </View>
            <View style={styles.featureText}>
              <AppText role="label">Matched 8-Athlete Fields</AppText>
              <AppText role="caption" secondary>
                Climb Elo divisions with live splits, Sunday finishes, and overtake alerts.
              </AppText>
            </View>
          </View>
        </View>

        {/* Plan Selectors */}
        <View style={styles.planList}>
          {(["annual", "monthly", "lifetime"] as const).map((key) => {
            const plan = ENTRY_PASS_PLANS[key];
            const isSelected = selectedPlanKey === key;

            return (
              <Pressable
                key={plan.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${plan.title}, ${plan.priceDisplay}`}
                onPress={() => setSelectedPlanKey(key)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isSelected ? `${c.tennis}15` : c.card,
                    borderColor: isSelected ? c.ink : c.line,
                  },
                ]}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planTitleRow}>
                    <AppText role="heading">{plan.title}</AppText>
                    {Boolean(plan.badge) && (
                      <View style={[styles.badge, { backgroundColor: c.ink }]}>
                        <AppText role="label" style={{ color: c.paper }}>
                          {plan.badge}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <AppText role="display">{plan.priceDisplay}</AppText>
                </View>
                <AppText role="caption" secondary>
                  {plan.description}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Feedback Alert if any */}
        {Boolean(feedback) && (
          <View style={[styles.feedbackBox, { backgroundColor: `${c.tennis}20` }]}>
            <AppText role="caption" style={{ color: c.ink }}>
              {feedback}
            </AppText>
          </View>
        )}

        {/* Action Button */}
        <FocusButton
          label={
            busy
              ? "Connecting to Store…"
              : selectedPlan.interval === "lifetime"
              ? `Unlock Lifetime Pass — ${selectedPlan.priceDisplay}`
              : `Subscribe — ${selectedPlan.priceDisplay}`
          }
          disabled={busy || restoreBusy}
          onPress={handlePurchase}
        />

        {/* Restore & Legal footer */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={busy || restoreBusy}
            onPress={handleRestore}
            style={styles.restoreBtn}
          >
            {restoreBusy ? (
              <ActivityIndicator size="small" color={c.ink} />
            ) : (
              <AppText role="caption" secondary style={styles.restoreText}>
                Restore Purchases
              </AppText>
            )}
          </Pressable>

          <LegalLinks />

          <AppText role="caption" secondary style={styles.finePrint}>
            Payment will be charged to your App Store or Google Play account at confirmation of purchase.
            Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before
            the end of the current billing period. Manage or cancel in your account settings.
          </AppText>
        </View>
      </View>
    </FocusSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  featuresCard: {
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  planList: {
    gap: 10,
  },
  planCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 6,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 12,
  },
  footer: {
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  restoreBtn: {
    minHeight: 36,
    justifyContent: "center",
  },
  restoreText: {
    textDecorationLine: "underline",
  },
  finePrint: {
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
