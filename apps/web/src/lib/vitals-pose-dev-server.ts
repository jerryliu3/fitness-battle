import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { isLocalHost } from "@/lib/auth/design-access";
import { mergePoseFile, type VitalsPoseFile } from "@/lib/vitals-pose";

const execFileAsync = promisify(execFile);

export const REPO_ROOT = path.resolve(process.cwd(), "../..");
export const POSE_FILE = path.join(REPO_ROOT, "body-pipeline/local/pose.json");
export const PREVIEW_SCRIPT = path.join(
  REPO_ROOT,
  "body-pipeline/scripts/preview_standing_pose.py",
);
export const PREVIEW_DIR = path.join(REPO_ROOT, "body-pipeline/generated");

export type PosePreviewGender = "male" | "female";

const PREVIEW_FILES: Record<PosePreviewGender, string> = {
  male: "pose-preview-male.png",
  female: "pose-preview-female.png",
};

let previewInFlight: Promise<void> | null = null;

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

export function previewPngPath(gender: PosePreviewGender): string {
  return path.join(PREVIEW_DIR, PREVIEW_FILES[gender]);
}

export async function runStandingPosePreview(): Promise<{ generatedAt: string }> {
  if (previewInFlight) {
    await previewInFlight;
  }

  const run = async () => {
    await execFileAsync("python3", [PREVIEW_SCRIPT], {
      cwd: REPO_ROOT,
      timeout: 180_000,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
  };

  previewInFlight = run().finally(() => {
    previewInFlight = null;
  });
  await previewInFlight;

  return { generatedAt: new Date().toISOString() };
}

export async function readPreviewPng(gender: PosePreviewGender): Promise<Buffer> {
  return readFile(previewPngPath(gender));
}

export function isPosePreviewGender(value: string | null): value is PosePreviewGender {
  return value === "male" || value === "female";
}
