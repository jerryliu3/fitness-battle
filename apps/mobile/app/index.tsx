import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "../src/lib/auth";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex: 1 }} />;
  return <Redirect href={user ? "/today" : "/welcome"} />;
}
