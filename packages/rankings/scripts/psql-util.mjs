import { spawn, spawnSync } from "node:child_process";

export function requireDatabaseUrl() {
  const url = process.env.RANKINGS_DATABASE_URL;
  if (!url) throw new Error("Set RANKINGS_DATABASE_URL for acquisition database operations.");
  return url;
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
