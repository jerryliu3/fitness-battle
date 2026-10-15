import { formatEloDelta, formatPlace, sportById, type PeriodResult } from "@fitness-battle/shared";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export function AwardCard({ result }: { result: PeriodResult }) {
  const sport = sportById(result.sport);
  return (
    <View style={styles.card} accessibilityLabel={`${sport.name} week result`}>
      <Text style={styles.kicker}>{sport.name}</Text>
      <Text style={styles.place}>{formatPlace(result.place, result.fieldSize)}</Text>
      <Text style={styles.delta}>{formatEloDelta(result.eloBefore, result.eloAfter)} rating</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: colors.plum,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  kicker: { fontFamily: fonts.bodyMedium, color: colors.tennis, fontSize: 12, textTransform: "uppercase" },
  place: { fontFamily: fonts.bodyBold, color: colors.paper, fontSize: 28 },
  delta: { fontFamily: fonts.body, color: colors.paper, fontSize: 14 },
});
