"use client";
import type { CSSProperties } from "react";
import { COMPETE_ART_COLORS, competeNow, eventRegistration, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { CompeteIcon, EventArt } from "./event-home";

export function EventRegistration({ state, event, busy, error, registered, onClaim }: { state: CompeteState; event: CompeteEvent; busy: boolean; error: string; registered: boolean; onClaim(): void }) {
  const detail = eventRegistration(state, event, competeNow(state));
  return <div className="event-registration" style={{ "--registration-color": COMPETE_ART_COLORS[event] } as CSSProperties}>
    <div className="registration-hero"><EventArt event={event} /><div className="registration-sport"><CompeteIcon name={event} /><AppText role="label">{detail.name}</AppText></div><AppText role="label">{detail.dateRange}</AppText></div>
    <div><AppText role="label">Starts {detail.starts}</AppText><br /><AppText role="caption" secondary>Ends {detail.ends}</AppText></div>
    <AppHeading>Event details</AppHeading>
    <div className="registration-details">{detail.details.map((item, i) => <details key={item.title}><summary><span className="registration-detail-icon"><CompeteIcon name={(["time", "crew", "trophy", event] as const)[i]!} /></span><span><AppText role="label">{item.title}</AppText><AppText role="caption" secondary>{item.summary}</AppText></span><span aria-hidden="true">＋</span></summary><AppParagraph typographyRole="caption" className="ui-text-secondary">{item.detail}</AppParagraph></details>)}</div>
    <div className="registration-pass"><EventArt event={event} /><AppText role="caption">WEEKLY ENTRY PASS</AppText><AppHeading>{detail.name} Meet</AppHeading><AppText>{detail.dateRange}</AppText><div><AppText role="caption">Admits 1 competitor</AppText><span className="registration-barcode" aria-hidden="true" /></div></div>
    <AppParagraph typographyRole="caption" className="ui-text-secondary">{detail.renewal}</AppParagraph>
    {error && <AppParagraph typographyRole="caption" role="alert">{error}</AppParagraph>}
    <button type="button" className="fb-btn" disabled={busy || registered} onClick={onClaim}>{registered ? "Already registered" : busy ? "Claiming entry…" : "Claim entry pass"}</button>
  </div>;
}
