/** Server-side worker configuration. Never import into a product client. */
export function rankingsWorkerEnv() {
  return {
    callerId:process.env.RANKINGS_RUNSIGNUP_CALLER_ID ?? "",
    callerSecret:process.env.RANKINGS_RUNSIGNUP_CALLER_SECRET ?? "",
  };
}
