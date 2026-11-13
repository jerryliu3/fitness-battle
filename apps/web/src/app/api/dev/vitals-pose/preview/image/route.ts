import {
  isPosePreviewGender,
  readPreviewPng,
  vitalsPoseDevAllowed,
} from "@/lib/vitals-pose-dev-server";

export async function GET(request: Request) {
  if (!vitalsPoseDevAllowed(request)) return new Response(null, { status: 404 });

  const url = new URL(request.url);
  const gender = url.searchParams.get("gender");
  if (!isPosePreviewGender(gender)) {
    return Response.json({ error: "gender must be male or female" }, { status: 400 });
  }

  try {
    const bytes = await readPreviewPng(gender);
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Preview image missing — POST /api/dev/vitals-pose/preview first" },
      { status: 404 },
    );
  }
}
