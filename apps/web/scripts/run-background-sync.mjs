import fs from "node:fs";
import module from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const OPTIONAL_PROVIDER_ENV = [
  ["Strava", "STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET"],
  ["Oura", "OURA_CLIENT_ID", "OURA_CLIENT_SECRET"],
  ["WHOOP", "WHOOP_CLIENT_ID", "WHOOP_CLIENT_SECRET"],
  ["Expo Push", "EXPO_ACCESS_TOKEN"],
];

const missingRequired = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
if (missingRequired.length > 0) {
  console.error(
    `Missing required environment variables: ${missingRequired.join(", ")}`,
  );
  process.exit(1);
}

for (const [label, ...keys] of OPTIONAL_PROVIDER_ENV) {
  const missing = keys.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    console.warn(
      `[cron-sync] ${label} env incomplete (missing: ${missing.join(", ")}); related sync/push calls may skip or fail.`,
    );
  }
}

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const webSrc = path.join(repoRoot, "apps/web/src");
const sharedSrc = path.join(repoRoot, "packages/shared/src");

function resolveLocalModule(specifier, parentDir) {
  let target = null;
  if (specifier.startsWith("@/")) {
    target = path.join(webSrc, specifier.slice(2));
  } else if (specifier === "@fitness-battle/shared") {
    target = path.join(sharedSrc, "index.ts");
  } else if (specifier.startsWith("@fitness-battle/shared/")) {
    target = path.join(
      sharedSrc,
      specifier.slice("@fitness-battle/shared/".length),
    );
  } else if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    parentDir &&
    (parentDir.startsWith(webSrc) || parentDir.startsWith(sharedSrc))
  ) {
    target = path.resolve(parentDir, specifier);
  }
  if (!target) return null;

  for (const candidate of [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    path.join(target, "index.ts"),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

module.registerHooks({
  resolve(specifier, context, nextResolve) {
    const parentDir = context.parentURL?.startsWith("file:")
      ? path.dirname(fileURLToPath(context.parentURL))
      : null;
    const resolved = resolveLocalModule(specifier, parentDir);
    if (resolved) return { url: resolved, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (
      url.startsWith("file:") &&
      url.endsWith(".json") &&
      context.importAttributes?.type !== "json"
    ) {
      return {
        format: "json",
        source: fs.readFileSync(fileURLToPath(url), "utf8"),
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const { getSupabaseConfig } = await import(
  pathToFileURL(path.join(webSrc, "lib/supabase/config.ts")).href
);
if (!getSupabaseConfig().configured) {
  console.error("Supabase URL/anon key are placeholders or not configured.");
  process.exit(1);
}

const { runBackgroundProviderSync } = await import(
  pathToFileURL(path.join(webSrc, "lib/background-fitness-sync.ts")).href
);

// GitHub Actions runners are not subject to Vercel's 60s serverless limit.
const budgetMs = Number(process.env.SYNC_BUDGET_MS ?? 5 * 60_000);
const summary = await runBackgroundProviderSync(
  Number.isFinite(budgetMs) && budgetMs > 0 ? budgetMs : 5 * 60_000,
);
console.log(JSON.stringify({ ok: true, ...summary }));
