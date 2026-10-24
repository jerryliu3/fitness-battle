import { unzipSync } from "fflate";
import { NextResponse } from "next/server";
import { parseActivityFile, type ActivitySample } from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { persistSyncedActivities } from "@/lib/fitness-store";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

function filesFromUpload(name: string, bytes: Uint8Array): { name: string; bytes: Uint8Array }[] {
  if (!name.toLowerCase().endsWith(".zip")) return [{ name, bytes }];
  const archive = unzipSync(bytes);
  return Object.entries(archive)
    .filter(([entry]) => !entry.endsWith("/") && !entry.startsWith("__MACOSX"))
    .map(([entry, data]) => ({ name: entry.split("/").pop() || entry, bytes: data }));
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "expected_form" }, { status: 400 });
  const userId = await resolveRequestUserId(
    request,
    typeof form.get("userId") === "string" ? String(form.get("userId")) : null,
  );
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const activities: ActivitySample[] = [];
  try {
    for (const entry of filesFromUpload(file.name, bytes)) {
      const lower = entry.name.toLowerCase();
      if (!/\.(fit|gpx|tcx)$/.test(lower)) continue;
      activities.push(...parseActivityFile(entry.name, entry.bytes, "garmin").activities);
    }
  } catch {
    return NextResponse.json({ error: "unsupported_activity_file" }, { status: 400 });
  }
  if (activities.length === 0) {
    return NextResponse.json({ error: "no_activities" }, { status: 422 });
  }

  let persisted = false;
  try {
    persisted = await persistSyncedActivities(userId, activities, "imported");
  } catch {
    persisted = false;
  }

  return NextResponse.json({
    provider: "garmin",
    activities,
    persisted,
    usedMock: false,
    source: "file",
  });
}
