import { SHELL_TABS, type ShellTabId } from "@fitness-battle/shared";
import { Card } from "heroui-native/card";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SHELL_COLORS } from "../theme";

export function EmptyTab({ id }: { id: ShellTabId }) {
  const tab = SHELL_TABS.find((item) => item.id === id);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.body}>
        <Card>
          <Card.Body>
            <Card.Title>{tab?.label ?? id}</Card.Title>
            <Card.Description>This tab is empty until its screen lands.</Card.Description>
          </Card.Body>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SHELL_COLORS.paper },
  body: { flex: 1, padding: 20, justifyContent: "center" },
});
