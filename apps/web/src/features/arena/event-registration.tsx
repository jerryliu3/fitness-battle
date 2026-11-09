"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { COMPETE_ART_COLORS, competeNow, eventRegistration, entryBarcode, registrationDetailCards, evaluateSportClaimAllowance, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { WaveCountdown } from "@/ui/wave-countdown";
import { CompeteIcon, EventArt } from "./event-home";

export function EventRegistration({
  state,
  event,
  busy,
  error,
  registered,
  onClaim,
  onView,
  onNeedPass,
}: {
  state: CompeteState;
  event: CompeteEvent;
  busy: boolean;
  error: string;
  registered: boolean;
  onClaim(): void;
  onView(): void;
  onNeedPass?: () => void;
}) {
  const reduced = useReducedMotion();
  const transition = { duration: reduced ? 0 : .18 };
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const claimed = registered || claiming;
  useEffect(() => { if (error) setClaiming(false); }, [error]);
  const now = competeNow(state);
  const detail = eventRegistration(state, event, now);

  const enrolledSports = (state?.enrollments ?? []).map((e) => e.sport);
  const sleepOptedIn = Boolean(
    state?.healthRatings?.some((r) => r.metric === "sleep" && r.optedIn)
  );
  const allowance = evaluateSportClaimAllowance({
    entitlement: state.entryPass,
    enrolledSports,
    candidateSport: event,
    sleepOptedIn,
  });
  return <div className="event-registration" style={{ "--registration-color": COMPETE_ART_COLORS[event] } as CSSProperties}>
    <AnimatePresence mode="wait" initial={false}>
    {step === 0 && <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={transition} className="registration-step" key="event"><div className="registration-hero"><EventArt event={event} /><AppHeading>{detail.name} Meet</AppHeading><AppParagraph>{detail.description}</AppParagraph></div>
    <div className="registration-mysteries" aria-label="You and seven mystery athletes">{Array.from({ length: 8 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 65}ms` }}>{i === 0 ? "You" : "?"}</span>)}</div></motion.div>}
    {step === 1 && <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={transition} className="registration-details registration-step" key="details">{registrationDetailCards(detail).map((item, i) => <details key={item.title} open={expanded === i}><summary onClick={e => { e.preventDefault(); setExpanded(expanded === i ? null : i); }}><span className="registration-detail-icon"><CompeteIcon name={(["time", "time", "trophy"] as const)[i]!} /></span><span><AppText role="label">{item.title}</AppText><AppText role="caption" secondary>{item.summary}</AppText></span><span aria-hidden="true">＋</span></summary><AppParagraph typographyRole="caption" className="ui-text-secondary">{item.detail}</AppParagraph></details>)}</motion.div>}
    {step === 2 && <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={transition} className="registration-ticket-scene registration-step" key="ticket">
      <div className="registration-ticket" data-claimed={claimed}>
        <div className="registration-face registration-front" inert={claimed} aria-hidden={claimed}>
          <div className="registration-ticket-art"><EventArt event={event} /><CompeteIcon name={event} size={44} /></div>
          <div className="registration-ticket-body">
            <AppHeading>{detail.name} Meet</AppHeading><AppText role="label">{detail.details[2]!.summary} league</AppText>
            <AppText role="label">Starts {detail.starts}</AppText>
            <div className="registration-ticket-stub"><span className="registration-barcode" aria-hidden="true">{entryBarcode(`${event}:${detail.start}`).map((width, i) => <i key={i} style={{ flexGrow: width }} />)}</span></div>
            <button
              type="button"
              className="fb-btn"
              disabled={busy || (claimed && allowance.allowed)}
              onClick={
                !allowance.allowed
                  ? () => onNeedPass?.()
                  : () => {
                      setClaiming(true);
                      setTimeout(onClaim, 60);
                    }
              }
            >
              {busy
                ? "Claiming your spot…"
                : !allowance.allowed
                ? "Unlock with Entry Pass ($0.99/mo)"
                : "Claim your spot"}
            </button>
          </div>
        </div>
        <div className="registration-face registration-back" inert={!claimed} aria-hidden={!claimed}>
          <div className="registration-ticket-body">
            <AppHeading role="display">You’re on the start list.</AppHeading>
            <div className="registration-ticket-countdown"><AppText role="caption" secondary>YOUR WAVE STARTS IN</AppText>{claimed && <WaveCountdown start={detail.start} now={now} />}</div>
              <div className="registration-entry-stamp" aria-label={`${detail.name}, ${detail.dateRange}, ${detail.stampYear}`}><CompeteIcon name={event} size={30} /><div><AppText role="label">{detail.name}</AppText><AppText role="caption">{detail.dateRange} · {detail.stampYear}</AppText></div></div>
            <div className="registration-ticket-stub"><span className="registration-barcode" aria-hidden="true">{entryBarcode(`${event}:${detail.start}`).map((width, i) => <i key={i} style={{ flexGrow: width }} />)}</span></div>
            <button type="button" className="fb-btn" onClick={onView}>View {Date.parse(detail.start) > now.getTime() ? "upcoming race" : "race"} →</button>
          </div>
        </div>
      </div>
    </motion.div>
    }
    </AnimatePresence>
    <div className="registration-step-actions">{step < 2 && <button type="button" className="fb-btn" onClick={() => setStep(step + 1)}>Continue</button>}</div>
    <span className="sr-only" role="status">{registered ? "You’re on the start list." : ""}</span>
    {error && <AppParagraph typographyRole="caption" role="alert">{error}</AppParagraph>}

  </div>;
}
