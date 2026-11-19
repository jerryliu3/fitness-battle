import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminWaveMember = {
  id: string;
  displayName: string;
  email: string | null;
};

export type AdminWaveFieldParticipants = {
  fieldId: string;
  fieldName: string;
  sport: string;
  members: AdminWaveMember[];
};

type WeekFieldRow = {
  id: string;
  name: string;
  sport: string;
  wave_start: string;
  member_ids: string[] | null;
};

async function memberEmails(db: SupabaseClient, ids: string[]) {
  const emails = new Map<string, string | null>();
  const unique = [...new Set(ids)];
  for (let index = 0; index < unique.length; index += 8) {
    const chunk = unique.slice(index, index + 8);
    await Promise.all(chunk.map(async (id) => {
      const { data, error } = await db.auth.admin.getUserById(id);
      emails.set(id, error ? null : data.user?.email ?? null);
    }));
  }
  return emails;
}

export async function loadAdminWaveParticipants(db: SupabaseClient, waveStarts: string[]) {
  const participantsByWave: Record<string, AdminWaveFieldParticipants[]> = {};
  const normalizedStarts = [...new Set(waveStarts)];
  if (!normalizedStarts.length) return participantsByWave;

  const { data: fields, error } = await db
    .from("week_fields")
    .select("id,name,sport,wave_start,member_ids")
    .in("wave_start", normalizedStarts);
  if (error) throw error;

  const rows = (fields ?? []) as WeekFieldRow[];
  const memberIds = [...new Set(rows.flatMap(row => row.member_ids ?? []))];
  const profiles = new Map<string, string>();
  if (memberIds.length) {
    const { data: profileRows, error: profileError } = await db.from("profiles").select("id,display_name").in("id", memberIds);
    if (profileError) throw profileError;
    for (const row of profileRows ?? []) profiles.set(row.id, row.display_name);
  }
  const emails = memberIds.length ? await memberEmails(db, memberIds) : new Map<string, string | null>();

  for (const start of normalizedStarts) participantsByWave[start] = [];
  const waveKeyFor = (fieldStart: string) =>
    normalizedStarts.find(start => new Date(start).getTime() === new Date(fieldStart).getTime()) ?? fieldStart;

  for (const field of rows) {
    const members = (field.member_ids ?? []).map(id => ({
      id,
      displayName: profiles.get(id) ?? "Athlete",
      email: emails.get(id) ?? null,
    }));
    const waveKey = waveKeyFor(field.wave_start);
    if (!participantsByWave[waveKey]) participantsByWave[waveKey] = [];
    participantsByWave[waveKey].push({
      fieldId: field.id,
      fieldName: field.name,
      sport: field.sport,
      members,
    });
  }
  return participantsByWave;
}