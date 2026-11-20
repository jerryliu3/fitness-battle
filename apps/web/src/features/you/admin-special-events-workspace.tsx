"use client";

import { useEffect, useState } from "react";
import {
  SPECIAL_EVENT_PRESETS,
  SPORTS,
  buildSpecialEventPreset,
  specialEventFormatLabel,
  specialEventPhase,
  type SaveSpecialEventEditionInput,
  type SpecialEventEdition,
  type SpecialEventPresetId,
  type SpecialEventTemplate,
  type SportId,
} from "@fitness-battle/shared";
import { AppParagraph, SectionHeader } from "@/ui/section";
import { AdminStatusNote, AdminTable, adminCell, formatWaveWhen, useAdminRouteApi } from "./admin-route-shared";

const newDraft = (preset: SpecialEventPresetId = "daily_survivor", sport: SportId = "running"): SaveSpecialEventEditionInput => ({
  id: null,
  ...buildSpecialEventPreset(preset, sport),
});

const toInput = (e: SpecialEventEdition, published = Boolean(e.published)): SaveSpecialEventEditionInput => ({
  id: e.id, slug: e.slug, seriesKey: e.seriesKey, sport: e.sport, title: e.title, subtitle: e.subtitle,
  config: e.config, registrationOpensAt: e.registrationOpensAt, registrationClosesAt: e.registrationClosesAt,
  startsAt: e.startsAt, endsAt: e.endsAt, published,
});

const TEXT_FIELDS = [
  ["title", "Title"],
  ["subtitle", "Subtitle"],
  ["slug", "Slug"],
  ["seriesKey", "Series key"],
  ["registrationOpensAt", "Registration opens (ISO)"],
  ["registrationClosesAt", "Registration closes (ISO)"],
  ["startsAt", "Starts at (ISO, Mon 06:00 ET)"],
  ["endsAt", "Ends at (ISO, Mon 00:00 ET)"],
] as const;

export function AdminSpecialEventsWorkspace() {
  const { busy, note, setNote, perform, read } = useAdminRouteApi();
  const [editions, setEditions] = useState<SpecialEventEdition[]>([]);
  const [templates, setTemplates] = useState<SpecialEventTemplate[]>([]);
  const [draft, setDraft] = useState<SaveSpecialEventEditionInput>(() => newDraft());
  const [configText, setConfigText] = useState(() => JSON.stringify(newDraft().config, null, 2));
  const [cadenceWeeks, setCadenceWeeks] = useState(1);

  function resetDraft(next = newDraft()) {
    setDraft(next);
    setConfigText(JSON.stringify(next.config, null, 2));
  }

  function load() {
    void perform(async (signal, current) => {
      const data = await read("/api/admin/special-events", signal);
      if (!current()) return;
      setEditions((data.editions ?? []) as SpecialEventEdition[]);
      setTemplates((data.templates ?? []) as SpecialEventTemplate[]);
    });
  }

  useEffect(() => { load(); }, []);

  function save(payload: unknown, message: string, clear = false) {
    void perform(async (signal, current) => {
      await read("/api/admin/special-events", signal, payload);
      if (!current()) return;
      setNote(message);
      if (clear) resetDraft();
      load();
    });
  }

  function parseConfigJson(): SaveSpecialEventEditionInput["config"] | null {
    try { return JSON.parse(configText) as SaveSpecialEventEditionInput["config"]; }
    catch { setNote("Config JSON is invalid."); return null; }
  }

  function saveDraft(overridePublished?: boolean) {
    const config = parseConfigJson();
    if (!config) return;
    save(
      { ...draft, config, published: overridePublished ?? draft.published },
      draft.id ? "Special event edition updated." : "Special event edition created.",
      true,
    );
  }

  function saveAsTemplate() {
    const config = parseConfigJson();
    if (!config) return;
    const existing = templates.find((t) => t.seriesKey === draft.seriesKey);
    save(
      {
        kind: "template",
        id: existing?.id ?? null,
        seriesKey: draft.seriesKey,
        sport: draft.sport,
        title: draft.title,
        subtitle: draft.subtitle,
        config,
        cadenceWeeks,
        active: true,
        nextStartAt: draft.startsAt,
      },
      existing ? "Repeating template updated." : "Repeating template saved.",
    );
  }

  function patchAdmin(body: Record<string, unknown>, message: (data: Record<string, unknown>) => string) {
    void perform(async (signal, current) => {
      const response = await fetch("/api/admin/special-events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update special events.");
      if (!current()) return;
      setNote(message(data));
      load();
    });
  }

  const now = new Date();
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="fb-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <SectionHeader
          title={draft.id ? `Edit edition · ${draft.title}` : "Create special event edition"}
          action={draft.id ? <button type="button" className="fb-btn-line" disabled={busy} onClick={() => resetDraft()}>New edition</button> : null}
        />
        <AppParagraph typographyRole="body">
          Full-week editions pre-register the week prior and lock Monday 6:00 AM ET. Pick a preset or edit the 4-axis config JSON.
        </AppParagraph>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SPECIAL_EVENT_PRESETS.map((p) => (
            <button key={p.id} type="button" className="fb-btn-line" disabled={busy} onClick={() => { resetDraft(newDraft(p.id, draft.sport)); setNote(`Loaded "${p.label}" preset.`); }}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="admin-split" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label className="fb-copy">
            Sport
            <select className="fb-input" value={draft.sport} disabled={busy} onChange={(e) => setDraft({ ...draft, sport: e.target.value as SportId })}>
              {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="fb-copy" style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
            <input type="checkbox" checked={draft.published} disabled={busy} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
            Published on Compete tab
          </label>
          {TEXT_FIELDS.map(([key, label]) => (
            <label key={key} className="fb-copy">
              {label}
              <input className="fb-input" value={draft[key]} disabled={busy} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
            </label>
          ))}
        </div>

        <label className="fb-copy">
          4-Axis Config JSON
          <textarea className="fb-input" rows={9} style={{ width: "100%" }} value={configText} disabled={busy} onChange={(e) => setConfigText(e.target.value)} />
        </label>

        <div className="focus-actions" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="fb-btn" disabled={busy} onClick={() => saveDraft()}>{draft.id ? "Save changes" : "Save edition"}</button>
          {!draft.published ? <button type="button" className="fb-btn-line" disabled={busy} onClick={() => saveDraft(true)}>Save & publish</button> : null}
          <select aria-label="Repeat cadence weeks" className="fb-input" style={{ width: "auto" }} value={cadenceWeeks} disabled={busy} onChange={(e) => setCadenceWeeks(Number(e.target.value))}>
            {[1, 2, 3, 4].map((w) => <option key={w} value={w}>Every {w} wk{w > 1 ? "s" : ""}</option>)}
          </select>
          <button type="button" className="fb-btn-line" disabled={busy} onClick={saveAsTemplate}>Save as repeating template</button>
        </div>
      </section>

      <section className="fb-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <SectionHeader title="Scheduled editions" action={<button type="button" className="fb-btn-line" disabled={busy} onClick={load}>Refresh</button>} />
        <AdminTable ariaLabel="Special event editions">
          <thead>
            <tr>
              <th style={adminCell}>Edition</th>
              <th style={adminCell}>Format / Sport</th>
              <th style={adminCell}>Schedule (ET)</th>
              <th style={adminCell}>Entrants</th>
              <th style={adminCell}>State</th>
              <th style={adminCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {editions.length ? editions.map((e) => (
              <tr key={e.id}>
                <td style={adminCell}><strong>{e.title}</strong><br /><code className="fb-copy">{e.slug}</code></td>
                <td style={adminCell}>{specialEventFormatLabel(e.config)}<br />{e.sport}</td>
                <td style={adminCell}>Starts: {formatWaveWhen(e.startsAt)}<br />Ends: {formatWaveWhen(e.endsAt)}</td>
                <td style={adminCell}>{e.entrantCount}</td>
                <td style={adminCell}>{e.published ? "Published" : "Draft"} · {specialEventPhase(e, now)}</td>
                <td style={adminCell}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="fb-btn-line" disabled={busy} onClick={() => { resetDraft(toInput(e)); setNote(""); }}>Edit</button>
                    <button type="button" className="fb-btn-line" disabled={busy} onClick={() => save(toInput(e, !e.published), e.published ? "Edition unpublished." : "Edition published to Compete.")}>
                      {e.published ? "Unpublish" : "Publish"}
                    </button>
                    {!e.finalizedAt ? (
                      <button type="button" className="fb-btn-line" disabled={busy} onClick={() => patchAdmin({ editionId: e.id, action: "finalize" }, () => "Edition finalized.")}>Finalize</button>
                    ) : !e.settledAt ? (
                      <button type="button" className="fb-btn-line" disabled={busy} onClick={() => patchAdmin({ editionId: e.id, action: "settle_round" }, () => "Round settled.")}>Settle round</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan={6} style={adminCell}>No special event editions scheduled yet.</td></tr>}
          </tbody>
        </AdminTable>
      </section>

      <section className="fb-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <SectionHeader
          title="Repeating templates"
          action={
            <button
              type="button"
              className="fb-btn-line"
              disabled={busy}
              onClick={() => patchAdmin({ action: "materialize_templates" }, (d) => `Scheduler ran · ${Number(d.created ?? 0)} edition(s) created.`)}
            >
              Run scheduler
            </button>
          }
        />
        <AppParagraph typographyRole="body">
          Active templates automatically publish their next full-week edition when pre-registration opens (7 days prior).
        </AppParagraph>
        <AdminTable ariaLabel="Special event templates">
          <thead>
            <tr>
              <th style={adminCell}>Series</th>
              <th style={adminCell}>Format / Sport</th>
              <th style={adminCell}>Cadence / Next start (ET)</th>
              <th style={adminCell}>State</th>
              <th style={adminCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.length ? templates.map((t) => (
              <tr key={t.id}>
                <td style={adminCell}><strong>{t.title}</strong><br /><code className="fb-copy">{t.seriesKey}</code></td>
                <td style={adminCell}>{specialEventFormatLabel(t.config)}<br />{t.sport}</td>
                <td style={adminCell}>Every {t.cadenceWeeks} wk{t.cadenceWeeks > 1 ? "s" : ""}<br />{formatWaveWhen(t.nextStartAt)}</td>
                <td style={adminCell}>{t.active ? "Active" : "Paused"}</td>
                <td style={adminCell}>
                  <button
                    type="button"
                    className="fb-btn-line"
                    disabled={busy}
                    onClick={() => save({ kind: "template", ...t, active: !t.active }, t.active ? "Template paused." : "Template resumed.")}
                  >
                    {t.active ? "Pause" : "Resume"}
                  </button>
                </td>
              </tr>
            )) : <tr><td colSpan={5} style={adminCell}>No repeating templates yet.</td></tr>}
          </tbody>
        </AdminTable>
      </section>

      <AdminStatusNote note={note} />
    </div>
  );
}
