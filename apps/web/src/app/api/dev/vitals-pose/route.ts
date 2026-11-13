import type { VitalsPoseFile } from "@/lib/vitals-pose";
import {
  readMergedPoseFile,
  vitalsPoseDevAllowed,
  writeMergedPoseFile,
} from "@/lib/vitals-pose-dev-server";

export async function GET(request: Request) {
  if (!vitalsPoseDevAllowed(request)) return new Response(null, { status: 404 });
  const bones = await readMergedPoseFile();
  return Response.json(
    {
      bones,
      path: "body-pipeline/local/pose.json",
      regen: "pnpm bodies:generate && pnpm bodies:sync",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!vitalsPoseDevAllowed(request)) return new Response(null, { status: 404 });
  let payload: { bones?: VitalsPoseFile };
  try {
    payload = (await request.json()) as { bones?: VitalsPoseFile };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const next = await writeMergedPoseFile(payload.bones);

  return Response.json({
    ok: true,
    bones: next,
    regen: "pnpm bodies:generate && pnpm bodies:sync",
  });
}
