import { getPoseRig, isPosePreviewGender, vitalsPoseDevAllowed } from "@/lib/vitals-pose-dev-server";

export async function GET(request: Request) {
  if (!vitalsPoseDevAllowed(request)) return new Response(null, { status: 404 });
  const sex = new URL(request.url).searchParams.get("sex");
  if (!isPosePreviewGender(sex)) return Response.json({ error: "Invalid sex" }, { status: 400 });
  try {
    return new Response(await getPoseRig(sex), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Rig export failed" }, { status: 500 });
  }
}
