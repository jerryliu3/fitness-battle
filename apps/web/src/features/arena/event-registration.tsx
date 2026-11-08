"use client";
import type { CSSProperties } from "react";
import { COMPETE_ART_COLORS, competeNow, eventRegistration, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { WaveCountdown } from "@/ui/wave-countdown";
import { CompeteIcon, EventArt } from "./event-home";

export function EventRegistration({ state, event, busy, error, registered, onClaim, onView }: { state: CompeteState; event: CompeteEvent; busy: boolean; error: string; registered: boolean; onClaim(): void; onView(): void }) {
  const now = competeNow(state);
  const detail = eventRegistration(state, event, now);
  return <div className="event-registration" style={{ "--registration-color": COMPETE_ART_COLORS[event] } as CSSProperties}>
    <AppHeading role="display">{detail.headline}</AppHeading>
    <div className="registration-ticket-scene">
      <div className="registration-ticket" data-claimed={registered}>
        <div className="registration-face registration-front" inert={registered} aria-hidden={registered}>
          <div className="registration-ticket-art"><EventArt event={event} /><CompeteIcon name={event} size={44} /><AppText role="display">{event === "sleep" ? "Rest. Reset. Rise." : "Make your move."}</AppText></div>
          <div className="registration-ticket-body">
            <AppHeading>{detail.name} Meet</AppHeading>
            <AppText secondary>{detail.description}</AppText>
            <AppText role="label">Starts {detail.starts}</AppText>
            <div className="registration-ticket-stub"><AppText role="caption">ONE SPOT. YOURS TO TAKE.</AppText><span className="registration-barcode" aria-hidden="true" /></div>
            <button type="button" className="fb-btn" disabled={busy || registered} onClick={onClaim}>{busy ? "Claiming your spot…" : "Claim your spot ↗"}</button>
          </div>
        </div>
        <div className="registration-face registration-back" inert={!registered} aria-hidden={!registered}>
          <div className="registration-ticket-body">
            <AppText role="caption">ENTRY PASS</AppText>
            <AppHeading role="display">You’re on the start list.</AppHeading>
            <div className="registration-ticket-countdown"><AppText role="caption" secondary>YOUR WAVE STARTS IN</AppText>{registered && <WaveCountdown start={detail.start} now={now} />}</div>
            <AppText role="caption" secondary>Starts {detail.starts}</AppText>
            <div className="registration-entry-stamp" aria-label={`${detail.name}, ${detail.dateRange}, ${detail.stampYear}`}><CompeteIcon name={event} size={30} /><div><AppText role="label">{detail.name} · YOU’RE IN</AppText><AppText role="caption">{detail.dateRange} · {detail.stampYear}</AppText></div></div>
            <div className="registration-ticket-stub"><AppText role="caption">SPOT CLAIMED. LET’S GO.</AppText><span className="registration-barcode" aria-hidden="true" /></div>
            <button type="button" className="fb-btn" onClick={onView}>View {Date.parse(detail.start) > now.getTime() ? "upcoming race" : "race"} →</button>
          </div>
        </div>
      </div>
    </div>
    <span className="sr-only" role="status">{registered ? "You’re on the start list." : ""}</span>
    {error && <AppParagraph typographyRole="caption" role="alert">{error}</AppParagraph>}
    <div className="registration-details">{[...detail.details, { title: "Schedule & renewal", summary: `Ends ${detail.ends}`, detail: detail.renewal }].map((item, i) => <details key={item.title}><summary><span className="registration-detail-icon"><CompeteIcon name={(["time", "crew", "trophy", event, "time"] as const)[i]!} /></span><span><AppText role="label">{item.title}</AppText><AppText role="caption" secondary>{item.summary}</AppText></span><span aria-hidden="true">＋</span></summary><AppParagraph typographyRole="caption" className="ui-text-secondary">{item.detail}</AppParagraph></details>)}</div>
  </div>;
}
