import { textStyle, AppText  } from "./section";
import type { AwardCardModel } from "@fitness-battle/shared";
import { Card } from "heroui-native/card";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SHELL_COLORS, SHELL_RADIUS } from "../theme";

export function AwardShelf({ cards }: { cards: AwardCardModel[] }) {
  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText role="body" secondary>No week awards yet.</AppText>
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
            <AppText role="heading" accessibilityRole="header">{card.headline}</AppText>
            <AppText role="body" secondary>
              {card.sportName} · {card.weekLabel}
            </AppText>
          </Card.Header>
          <Card.Body>
            <Text style={styles.place}>{card.place}</Text>
            <AppText role="caption" secondary>
              {card.effort} effort · {card.delta} effort score
            </AppText>
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
    ...textStyle("display"),
    color: SHELL_COLORS.ink
},
  empty: { paddingVertical: 8 },

});
