import { createStravaProvider } from "@fitness-battle/shared";
import { serverEnv } from "./env";

export function getServerFitnessProvider() {
  return createStravaProvider({
    clientId: serverEnv.stravaClientId,
    clientSecret: serverEnv.stravaClientSecret,
    redirectUri: serverEnv.stravaRedirectUri,
  });
}
