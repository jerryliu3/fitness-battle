import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAthleteBlocks } from "../src/lib/athlete-blocks";
import { ScreenHeader } from "../src/ui/screen-header";
import { AppText, SectionStack } from "../src/ui/section";
import { FocusButton, f } from "../src/ui/focus";

export default function BlockedAthletes() {
  const router = useRouter();
  const { blocks, ready, error, reload, setBlocked } = useAthleteBlocks();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  async function unblock(id: string) {
    if (busy) return;
    setBusy(id); setNotice("");
    try { await setBlocked(id, false); setConfirm(null); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not unblock athlete."); }
    finally { setBusy(""); }
  }
  return <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
    <ScrollView contentContainerStyle={f.content}><SectionStack divided={false}>
      <ScreenHeader title="Blocked athletes" onBack={() => router.back()} />
      <AppText role="body" secondary>Blocked athletes are hidden from your view. Your standings and existing fields stay the same.</AppText>
      {error ? <><AppText role="body" secondary>{error}</AppText><FocusButton label="Retry" secondary onPress={() => void reload()} /></> : !ready ? <AppText role="body" secondary>Loading…</AppText> : blocks.length === 0 ? <AppText role="body" secondary>You haven't blocked anyone.</AppText> : blocks.map(item => <View key={item.id} style={f.row}>
        <AppText role="label" style={f.grow}>{item.name}</AppText>
        {confirm === item.id ? <View style={{ gap: 8 }}>
          <AppText role="caption" secondary>Unblock {item.name}?</AppText>
          <FocusButton label={busy === item.id ? "Saving…" : "Confirm unblock"} secondary disabled={!!busy} onPress={() => void unblock(item.id)} />
          <FocusButton label="Cancel" secondary disabled={!!busy} onPress={() => setConfirm(null)} />
        </View> : <FocusButton label="Unblock" secondary disabled={!!busy} onPress={() => setConfirm(item.id)} />}
      </View>)}
      {notice ? <AppText role="body" secondary accessibilityLiveRegion="polite">{notice}</AppText> : null}
    </SectionStack></ScrollView>
  </SafeAreaView>;
}
