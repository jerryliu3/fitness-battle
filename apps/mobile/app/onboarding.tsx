import { SPORTS, type SportId, type UnitSystem } from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/lib/auth";
import { useCompeteStore } from "../src/lib/compete-store";
import { FocusButton, f } from "../src/ui/focus";
export default function Onboarding() {
  const { state, dispatch } = useCompeteStore();
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [units, setUnits] = useState<UnitSystem | null>(null);
  const [sports, setSports] = useState<SportId[]>(["running"]);
  const [sleep, setSleep] = useState(false);
  if (!state)
    return (
      <SafeAreaView style={f.safe}>
        <Text style={f.copy}>Loading setup…</Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={f.safe}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={f.content}
      >
        <Text style={f.kicker}>Setup</Text>
        <Text style={f.title}>Your own pace.</Text>
        <Text style={f.copy}>
          Choose your preferences. Trackers and optional history calibration
          live in Athlete → Data Sync.
        </Text>
        <TextInput
          accessibilityLabel="Display name"
          style={f.input}
          value={name ?? state.name}
          onChangeText={setName}
          maxLength={80}
        />
        <TextInput
          accessibilityLabel="City"
          style={f.input}
          value={city ?? state.city}
          onChangeText={setCity}
          maxLength={80}
        />
        <Text style={f.h2}>Distance units</Text>
        {(["us", "metric"] as const).map((u) => (
          <FocusButton
            key={u}
            label={`${(units ?? state.units) === u ? "✓ " : ""}${u === "us" ? "Miles (US)" : "Kilometres"}`}
            secondary
            onPress={() => setUnits(u)}
          />
        ))}
        <Text style={f.h2}>Sports to join now</Text>
        {SPORTS.map((s) => (
          <FocusButton
            key={s.id}
            secondary
            label={`${sports.includes(s.id) ? "✓ " : ""}${s.name}`}
            onPress={() => setSports((current) => current.includes(s.id) ? current.length > 1 ? current.filter((id) => id !== s.id) : current : [...current, s.id])}
          />
        ))}
        <View style={f.row}>
          <Text style={f.rowTitle}>Track sleep & recovery</Text>
          <Switch
            accessibilityLabel="Track sleep and recovery"
            value={sleep}
            onValueChange={setSleep}
          />
        </View>
        <FocusButton
          label={user ? "Finish setup" : "Sign in to finish setup"}
          onPress={() => {
            if (!user) {
              router.replace("/you");
              return;
            }
            dispatch({
              type: "rename",
              name: (name ?? state.name).trim() || user.displayName,
            });
            dispatch({ type: "set-city", city: (city ?? state.city).trim() });
            dispatch({ type: "set-units", units: units ?? state.units });
            for (const sport of sports) dispatch({ type: "opt-in", sport, accountId: user.id });
            dispatch({ type: "set-primary", sport: sports[0]! });
            if (sleep) dispatch({ type: "opt-in-health", metric: "sleep" });
            dispatch({ type: "complete-onboarding" });
            router.replace("/arena");
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
