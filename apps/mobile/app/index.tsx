import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useAuth } from "../src/lib/auth";
import { GUEST_INTRO_SEEN_KEY } from "../src/lib/guest-intro";

/** Show the try-first experience once to signed-out, first-time visitors. */
export default function Index() {
  const { user, loading } = useAuth();
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(GUEST_INTRO_SEEN_KEY)
      .then(value => { if (alive) setSeen(value === "1"); })
      .catch(() => { if (alive) setSeen(false); });
    return () => { alive = false; };
  }, []);
  if (loading || seen === null) return <View style={{ flex: 1 }} />;
  if (!user && !seen) return <Redirect href="/welcome" />;
  return <Redirect href="/today" />;
}
