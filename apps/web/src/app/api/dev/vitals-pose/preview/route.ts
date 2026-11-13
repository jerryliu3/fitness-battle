import type { VitalsPoseFile } from "@/lib/vitals-pose";
import {
  BODY_PIPELINE_VENV_HINT,
  runStandingPosePreview,
  vitalsPoseDevAllowed,
  writeMergedPoseFile,
} from "@/lib/vitals-pose-dev-server";

export async function POST(request: Request) {
  if (!vitalsPoseDevAllowed(request)) return new Response(null, { status: 404 });

  let payload: { bones?: VitalsPoseFile };
  try {
    payload = (await request.json()) as { bones?: VitalsPoseFile };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.bones || typeof payload.bones !== "object") {
    return Response.json({ error: "Missing bones" }, { status: 400 });
  }

  const bones = await writeMergedPoseFile(payload.bones);

  try {
    const { generatedAt } = await runStandingPosePreview();
    const qs = `v=${encodeURIComponent(generatedAt)}`;
    return Response.json({
      ok: true,
      bones,
      generatedAt,
      images: {
        male: `/api/dev/vitals-pose/preview/image?gender=male&${qs}`,
        female: `/api/dev/vitals-pose/preview/image?gender=female&${qs}`,
      },
      note: "Mesh silhouette preview only — run pnpm bodies:generate && pnpm bodies:sync for the scan.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed";
    return Response.json(
      {
        error: "Preview script failed",
        detail: message,
        hint: `Use the body-pipeline venv (includes matplotlib + anny): ${BODY_PIPELINE_VENV_HINT} — then restart pnpm dev.`,
      },
      { status: 500 },
    );
  }
}
