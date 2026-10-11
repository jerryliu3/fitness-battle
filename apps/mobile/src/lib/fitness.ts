import { defaultFitnessProvider } from "@fitness-battle/shared";
import { mobileEnv } from "./env";

const stravaEnv = {
  clientId: mobileEnv.stravaClientId,
  clientSecret: undefined,
  redirectUri: mobileEnv.stravaRedirectUri,
};

/** Client-facing provider. Token exchange stays on the web API. */
export const fitnessProvider = defaultFitnessProvider(stravaEnv);
