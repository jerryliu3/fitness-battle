import { createStravaProvider } from "@fitness-battle/shared";
import { serverEnv, webEnv } from "./env";
import { createDurableStravaStore } from "./fitness-store";

export function getServerFitnessProvider() {
  const store = createDurableStravaStore();
  // Demo mode must not start an OAuth flow the callback will refuse to finish.
  const env = webEnv.useDemoData
    ? {}
    : {
        clientId: serverEnv.stravaClientId,
        clientSecret: serverEnv.stravaClientSecret,
        redirectUri: serverEnv.stravaRedirectUri,
      };
  return createStravaProvider(env, store ? { store } : {});
}
