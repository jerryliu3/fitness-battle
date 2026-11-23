import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptRoot, "..", "..", "..");
const rankingsWorkdir = join(repoRoot, "rankings-db");

const RANKINGS_POOLER_HOST = "aws-0-us-east-2.pooler.supabase.com";
const RANKINGS_POOLER_PORT = "6543";
const RANKINGS_POOLER_USER = "postgres.nevwdslqilysyeaccptz";

let repoEnvLoaded = false;

/** Load gitignored `.env` files (repo root, then rankings-db). Does not override existing process.env. */
export function loadRankingsRepoEnv() {
  if (repoEnvLoaded) return;
  repoEnvLoaded = true;
  for (const envPath of [join(repoRoot, ".env"), join(rankingsWorkdir, ".env")]) {
    if (!existsSync(envPath)) continue;
    const text = readFileSync(envPath, "utf8");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function rankingsPoolerDatabaseUrl() {
  const password = process.env.RANKINGS_DB_PASSWORD?.trim();
  if (!password || password.includes("YOUR-DATABASE-PASSWORD") || password === "replace-me") return null;
  return `postgresql://${RANKINGS_POOLER_USER}:${encodeURIComponent(password)}@${RANKINGS_POOLER_HOST}:${RANKINGS_POOLER_PORT}/postgres`;
}

function normalizeDatabaseUrl(url) {
  if (!url) return null;
  if (url.includes("[YOUR-DATABASE-PASSWORD]") || url.includes("[YOUR-PASSWORD]")) {
    throw new Error(
      "Replace the password placeholder in RANKINGS_DATABASE_URL (or set RANKINGS_DB_PASSWORD in .env).",
    );
  }
  return url;
}

function rankingsLinked() {
  return (
    existsSync(join(rankingsWorkdir, "supabase", ".temp", "project-ref")) &&
    process.env.RANKINGS_SUPABASE_LINKED !== "0"
  );
}

/** Build a short-lived Postgres URL from `supabase db dump --linked --dry-run` (CLI login role). */
export function linkedDatabaseUrl() {
  const child = spawnSync("supabase", ["db", "dump", "--linked", "--dry-run"], {
    cwd: rankingsWorkdir,
    encoding: "utf8",
    env: process.env,
  });
  if (child.status !== 0) {
    throw new Error(child.stderr || "Could not resolve linked Supabase database URL.");
  }
  const pick = (name) => {
    const match = new RegExp(`export ${name}="([^"]*)"`).exec(child.stdout);
    return match?.[1] ?? null;
  };
  const host = pick("PGHOST");
  const port = pick("PGPORT") ?? "5432";
  const user = pick("PGUSER");
  const password = pick("PGPASSWORD");
  const database = pick("PGDATABASE") ?? "postgres";
  if (!host || !user || !password) {
    throw new Error("Linked database credentials were incomplete.");
  }
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function requireDatabaseUrl() {
  loadRankingsRepoEnv();
  const explicit = normalizeDatabaseUrl(process.env.RANKINGS_DATABASE_URL?.trim());
  if (explicit) return explicit;
  const pooler = rankingsPoolerDatabaseUrl();
  if (pooler) return pooler;
  if (rankingsLinked()) {
    throw new Error(
      "Rankings imports need the postgres pooler password (RANKINGS_DB_PASSWORD or RANKINGS_DATABASE_URL in repo .env). " +
        "The Supabase CLI login role cannot write the ledger.",
    );
  }
  throw new Error(
    "Set RANKINGS_DATABASE_URL or RANKINGS_DB_PASSWORD in the repo .env (see .env.example); " +
      "pooler host aws-0-us-east-2.pooler.supabase.com port 6543.",
  );
}

export async function psqlFile(databaseUrl, filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", ["-X", "-d", databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", filePath], {
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`psql exited ${code}`))));
  });
}

export function psqlQuery(databaseUrl, sql) {
  const child = spawnSync("psql", ["-X", "-d", databaseUrl, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  });
  if (child.status !== 0) {
    throw new Error(child.stderr || `psql query failed (${child.status})`);
  }
  return child.stdout.trim();
}

export async function psqlQueryLinked(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn("supabase", ["db", "query", "--linked", "--output-format", "json", sql], {
      cwd: rankingsWorkdir,
      encoding: "utf8",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(stderr || `supabase db query failed (${code})`));
      try {
        const payload = JSON.parse(stdout);
        resolve(payload.rows ?? []);
      } catch (error) {
        reject(error);
      }
    });
  });
}