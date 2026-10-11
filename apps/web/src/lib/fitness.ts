import { createStravaProvider } from "@fitness-battle/shared";
import { webEnv } from "./env";

export function getServerFitnessProvider() {
  return createStravaProvider({
    clientId: webEnv.stravaClientId,
    clientSecret: webEnv.stravaClientSecret,
    redirectUri: webEnv.stravaRedirectUri,
  });
}
