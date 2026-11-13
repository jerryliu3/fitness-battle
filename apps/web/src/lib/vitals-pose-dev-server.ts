import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { isLocalHost } from "@/lib/auth/design-access";
import { mergePoseFile, type VitalsPoseFile } from "@/lib/vitals-pose";

const execFileAsync = promisify(execFile);

export const REPO_ROOT = path.resolve(process.cwd(), "../..");
export const POSE_FILE = path.join(REPO_ROOT, "body-pipeline/local/pose.json");

export type PosePreviewGender = "male" | "female";

let cachedPython: string | null = null;

const VENV_PYTHON = [
  "body-pipeline/.venv/bin/python3",
  "body-pipeline/.venv/bin/python",
  "body-pipeline/.venv/Scripts/python.exe",
];

export async function resolveBodyPipelinePython(): Promise<string> {
  if (cachedPython) return cachedPython;
  for (const rel of VENV_PYTHON) {
    const abs = path.join(REPO_ROOT, rel);
    try {
      await access(abs, constants.X_OK);
      cachedPython = abs;
      return abs;
    } catch {
      /* try next */
    }
  }
  cachedPython = "python3";
  return cachedPython;
}

export const BODY_PIPELINE_VENV_HINT = "bash scripts/ensure-body-pipeline-venv.sh";

export async function assertBodyPipelinePythonReady(): Promise<string> {
  const python = await resolveBodyPipelinePython();
  try {
    await execFileAsync(python, ["-c", "import anny"], {
      cwd: REPO_ROOT,
      timeout: 60_000,
    });
  } catch {
    throw new Error(
      `Python at ${python} is missing anny. From repo root run: ${BODY_PIPELINE_VENV_HINT}`,
    );
  }
  return python;
}

export function vitalsPoseDevAllowed(request: Request): boolean {
  const url = new URL(request.url);
  return process.env.NODE_ENV === "development" && isLocalHost(url.hostname);
}

export async function writeMergedPoseFile(raw: VitalsPoseFile | undefined) {
  const next = mergePoseFile(raw);
  await mkdir(path.dirname(POSE_FILE), { recursive: true });
  await writeFile(POSE_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function readMergedPoseFile() {
  try {
    const raw = JSON.parse(await readFile(POSE_FILE, "utf8")) as VitalsPoseFile;
    return mergePoseFile(raw);
  } catch {
    return mergePoseFile(undefined);
  }
}

export function isPosePreviewGender(value: string | null): value is PosePreviewGender {
  return value === "male" || value === "female";
}

// Cache only identical phenotype inputs. Export files never enter public assets.
const rigCache = new Map<string, Promise<string>>();
export async function getPoseRig(sex: PosePreviewGender): Promise<string> {
  const phenotype = await readFile(path.join(REPO_ROOT, "body-pipeline/local/phenotype.json"), "utf8").catch(() => "");
  const key = `${sex}:${phenotype}`;
  const cached = rigCache.get(key);
  if (cached) return cached;
  const run = async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "anny-rig-"));
    try {
      const python = await assertBodyPipelinePythonReady();
      const out = path.join(directory, "rig.json");
      await execFileAsync(python, [path.join(REPO_ROOT, "body-pipeline/scripts/export_pose_rig.py"), "--sex", sex, "--out", out], {
        cwd: REPO_ROOT, timeout: 180_000, maxBuffer: 4 * 1024 * 1024,
      });
      return await readFile(out, "utf8");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  };
  // Bound memory when repeatedly tuning phenotype.
  if (rigCache.size >= 4) rigCache.clear();
  const promise = run().catch((error) => { rigCache.delete(key); throw error; });
  rigCache.set(key, promise);
  return promise;
}
