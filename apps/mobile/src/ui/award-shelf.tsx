import type { AwardCardModel } from "@fitness-battle/shared";
import { Card } from "heroui-native/card";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SHELL_COLORS, SHELL_RADIUS } from "../theme";

export function AwardShelf({ cards }: { cards: AwardCardModel[] }) {
  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No week awards yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Week awards"
    >
      {cards.map((card) => (
        <Card key={card.id} style={styles.card}>
          <Card.Header>
            <Card.Title>{card.headline}</Card.Title>
            <Card.Description>
              {card.sportName} · {card.weekLabel}
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Text style={styles.place}>{card.place}</Text>
            <Text style={styles.meta}>
              {card.effort} effort · {card.delta} effort score
            </Text>
          </Card.Body>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingVertical: 4 },
  card: { width: 220, borderRadius: SHELL_RADIUS.card },
  place: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    color: SHELL_COLORS.ink,
  },
  meta: {
    fontFamily: "DMSans_400Regular",
    color: SHELL_COLORS.muted,
    fontSize: 13,
  },
  empty: { paddingVertical: 8 },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    color: SHELL_COLORS.muted,
    fontSize: 15,
  },
});