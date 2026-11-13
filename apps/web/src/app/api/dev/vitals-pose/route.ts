import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isLocalHost } from "@/lib/auth/design-access";
import {
  DEFAULT_VITALS_POSE,
  mergePoseFile,
  type VitalsPoseFile,
} from "@/lib/vitals-pose";

const POSE_FILE = path.resolve(process.cwd(), "../../body-pipeline/local/pose.json");

function devAllowed(request: Request): boolean {
  const url = new URL(request.url);
  return process.env.NODE_ENV === "development" && isLocalHost(url.hostname);
}

async function readPose(): Promise<Record<keyof typeof DEFAULT_VITALS_POSE, (typeof DEFAULT_VITALS_POSE)[keyof typeof DEFAULT_VITALS_POSE]>> {
  try {
    const raw = JSON.parse(await readFile(POSE_FILE, "utf8")) as VitalsPoseFile;
    return mergePoseFile(raw);
  } catch {
    return mergePoseFile(undefined);
  }
}

export async function GET(request: Request) {
  if (!devAllowed(request)) return new Response(null, { status: 404 });
  const bones = await readPose();
  return Response.json(
    {
      bones,
      path: "body-pipeline/local/pose.json",
      preview: "python3 body-pipeline/scripts/preview_standing_pose.py",
      regen: "pnpm bodies:generate && pnpm bodies:sync",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!devAllowed(request)) return new Response(null, { status: 404 });
  let payload: { bones?: VitalsPoseFile };
  try {
    payload = (await request.json()) as { bones?: VitalsPoseFile };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const next = mergePoseFile(payload.bones);
  await mkdir(path.dirname(POSE_FILE), { recursive: true });
  await writeFile(POSE_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  return Response.json({
    ok: true,
    bones: next,
    preview: "python3 body-pipeline/scripts/preview_standing_pose.py",
    regen: "pnpm bodies:generate && pnpm bodies:sync",
  });
}
