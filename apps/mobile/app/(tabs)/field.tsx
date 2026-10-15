import {
  SPORTS,
  competeNow,
  duelViews,
  formatEffort,
  sportById,
  type SportId,
} from "@fitness-battle/shared";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useCompete } from "../../src/compete/store";
import { Button } from "../../src/ui/button";
import { Row } from "../../src/ui/row";
import { Screen } from "../../src/ui/screen";
import { colors, fonts } from "../../src/theme";

export default function FieldScreen() {
  const { state, dispatch } = useCompete();
  const [username, setUsername] = useState("");
  if (!state) return <Screen title="Field" />;

  const now = competeNow(state);
  const sport = sportById(state.primary);
  const duels = duelViews(state, now).filter((view) => view.duel.sport === state.primary);

  return (
    <Screen kicker="Field" title={sport.name}>
      {SPORTS.map((item) => {
        const joined = state.ratings.find((row) => row.sport === item.id)?.optedIn;
        const current = item.id === state.primary;
        return (
          <Row
            key={item.id}
            title={item.name}
            detail={current ? "This week" : joined ? "Joined" : "Not joined"}
            trailing={current ? "Current" : joined ? "Switch" : "Join"}
            onPress={() =>
              dispatch(
                joined
                  ? { type: "set-primary", sport: item.id as SportId }
                  : { type: "opt-in", sport: item.id as SportId },
              )
            }
          />
        );
      })}
      {duels.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Button
            label="Auto match a 1v1"
            onPress={() => dispatch({ type: "duel", sport: state.primary, mode: "auto" })}
          />
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Rival username"
            placeholderTextColor={colors.muted}
            style={{
              minHeight: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.line,
              paddingHorizontal: 14,
              fontFamily: fonts.body,
              color: colors.ink,
              backgroundColor: colors.card,
            }}
          />
          <Button
            tone="quiet"
            label="Practice that rival"
            disabled={username.trim().length === 0}
            onPress={() =>
              dispatch({ type: "duel", sport: state.primary, mode: "invite", username: username.trim() })
            }
          />
        </View>
      ) : (
        duels.map((view) => (
          <Row
            key={view.duel.id}
            title={view.duel.rivalName}
            detail={`${formatEffort(view.rivalEffort)} effort`}
            trailing={view.leading === "you" ? "You lead" : view.leading === "rival" ? "They lead" : "Level"}
          />
        ))
      )}
      <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13 }}>
        Crew fields are seated from the web app. This phone keeps your sport and 1v1.
      </Text>
    </Screen>
  );
}
