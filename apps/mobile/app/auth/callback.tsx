import { Redirect } from "expo-router";
import { useAuth } from "../../src/lib/auth";

export default function AuthCallback() {
  const { user } = useAuth();
  return <Redirect href={user ? "/today" : "/athlete"} />;
}
