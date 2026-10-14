import { Image, Text, View } from "react-native";
import { ui } from "./styles";

export function AceStrip({
  kicker = "THE FIELD",
  title,
  detail,
}: {
  kicker?: string;
  title: string;
  detail: string;
}) {
  return (
    <View style={ui.aceStrip}>
      <Image
        source={require("../../assets/ace.png")}
        style={ui.aceImage}
        accessibilityLabel="Ace, a friendly sporting star"
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={ui.kickerOnCard}>{kicker}</Text>
        <Text style={ui.cardTitle}>{title}</Text>
        <Text style={ui.cardNote}>{detail}</Text>
      </View>
    </View>
  );
}
