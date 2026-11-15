"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { COMPETE_ART_COLORS, competeNow, eventRegistration, entryBarcode, registrationDetailCards, registrationTicketRows, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { WaveCountdown } from "@/ui/wave-countdown";
import { CompeteIcon, EventArt } from "./event-home";

function TicketHeader({ event, tag, title, subtitle }: { event: CompeteEvent; tag: string; title: string; subtitle: string }) {
  return (
    <div className="registration-ticket-art">
      <EventArt event={event} />
      <div className="registration-ticket-art-top">
        <span className="registration-ticket-badge"><CompeteIcon name={event} size={24} /></span>
        <AppText role="field" className="registration-ticket-tag">{tag}</AppText>
      </div>
      <div className="registration-ticket-art-copy">
        <AppHeading role="display">{title}</AppHeading>
        <AppText role="body" className="registration-ticket-sub">{subtitle}</AppText>
      </div>
    </div>
  );
}

function TicketStub({ status, barcode }: { status: string; barcode: number[] }) {
  return (
    <div className="registration-ticket-stub">
      <div className="registration-stub-meta">
        <AppText role="caption" secondary>YOUR ENTRY</AppText>
        <AppText role="caption" secondary>{status}</AppText>
      </div>
      <span className="registration-barcode" aria-hidden="true">
        {barcode.map((width, i) => <i key={i} style={{ flexGrow: width }} />)}
      </span>
    </div>
  );
}

export function EventRegistration({
  state,
  event,
  busy,
  error,
  registered,
  crew = false,
  onClaim,
  onView,
  onClose,
}: {
  state: CompeteState;
  event: CompeteEvent;
  busy: boolean;
  error: string;
  registered: boolean;
  crew?: boolean;
  onClaim(): void;
  onView(): void;
  onClose?: () => void;
}) {
  const reduced = useReducedMotion();
  const transition = { duration: reduced ? 0 : 0.18 };
  const [step, setStep] = useState(registered ? 1 : 0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [claiming, setClaiming] = useState(false);
  const claimed = registered;
  const claimPending = !claimed && (busy || claiming);
  useEffect(() => { if (registered || error) setClaiming(false); }, [registered, error]);

  const now = competeNow(state);
  const detail = eventRegistration(state, event, now);
  const ruleCards = registrationDetailCards(detail);
  const ticketRows = registrationTicketRows(detail);
  const barcode = entryBarcode(`${event}:${detail.start}`);
  const eventTag = crew ? "Crew Derby" : "Weekly event";

  return (
    <div className="event-registration" style={{ "--registration-color": COMPETE_ART_COLORS[event] } as CSSProperties}>
      <div className="registration-topbar">
        <button
          type="button"
          className="registration-close"
          aria-label="Close registration"
          disabled={claimPending}
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="registration-dots" role="group" aria-label={`Step ${step + 1} of 2`}>
          <button
            type="button"
            className="registration-dot"
            data-active={step === 0}
            aria-label="Step 1: Event details"
            disabled={step === 0 || claimed}
            onClick={() => { if (step === 1 && !claimed) setStep(0); }}
          />
          <span className="registration-dot" data-active={step === 1} aria-hidden="true" />
        </div>
        <AppText role="caption" secondary className="registration-step-label">Step {step + 1} of 2</AppText>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={transition}
            className="registration-step"
            key="overview"
          >
            <div className="registration-hero">
              <EventArt event={event} />
              <div className="registration-hero-meta">
                <span className="registration-sport-pill">
                  <CompeteIcon name={event} size={14} />
                  <AppText role="caption">{detail.name}</AppText>
                </span>
                <AppText role="caption" secondary>{eventTag}</AppText>
              </div>
              <div className="registration-hero-copy">
                <AppHeading role="display">{detail.name} Meet</AppHeading>
                <AppParagraph>{detail.description}</AppParagraph>
              </div>
              <div className="registration-field-box">
                <AppText role="field" className="registration-eyebrow">YOUR FIELD</AppText>
                <div className="registration-mysteries" aria-label="You and seven mystery athletes">
                  {Array.from({ length: 8 }, (_, i) => (
                    <AppText as="span" role={i === 0 ? "field" : "caption"} key={i} className={i === 0 ? "is-you" : undefined} style={{ animationDelay: `${800 + i * 65}ms` }}>
                      {i === 0 ? "You" : "?"}
                    </AppText>
                  ))}
                </div>
                <AppText role="caption" secondary>Meet your competitors when you join.</AppText>
              </div>
            </div>

            <div className="registration-rules">
              <div className="registration-rules-head">
                <AppText role="label">How this race works</AppText>
                <AppText role="caption" secondary>Tap a card to learn more</AppText>
              </div>
              <div className="registration-rule-grid">
                {ruleCards.map((item, i) => {
                  const isFlipped = Boolean(flipped[i]);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="registration-rule-card"
                      data-flipped={isFlipped}
                      aria-pressed={isFlipped}
                      aria-label={`${item.title}, ${item.summary}. ${isFlipped ? item.detail : "Tap to see details."}`}
                      onClick={() => setFlipped(prev => ({ ...prev, [i]: !prev[i] }))}
                    >
                      <span className="registration-rule-inner">
                        <span className="registration-rule-face registration-rule-front" aria-hidden={isFlipped}>
                          <span className="registration-rule-flip" aria-hidden="true"><CompeteIcon name="replay" size={14} /></span>
                          <span className="registration-detail-icon"><CompeteIcon name={item.icon} size={20} /></span>
                          <span className="registration-rule-copy">
                            <AppText role="label">{item.title}</AppText>
                            <AppText role="caption" secondary>{item.summary}</AppText>
                          </span>
                        </span>
                        <span className="registration-rule-face registration-rule-back" aria-hidden={!isFlipped}>
                          <span className="registration-rule-back-head">
                            <AppText role="label">{item.title}</AppText>
                            <span className="registration-rule-flip" aria-hidden="true"><CompeteIcon name="replay" size={14} /></span>
                          </span>
                          <AppText role="caption" secondary>{item.detail}</AppText>
                          {item.footnote && <AppText role="field" className="registration-rule-footnote">{item.footnote}</AppText>}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={transition}
            className="registration-ticket-scene registration-step"
            key="ticket"
          >
            <div className="registration-ticket" data-claimed={claimed}>
              <div className="registration-face registration-front" inert={claimed} aria-hidden={claimed}>
                <TicketHeader
                  event={event}
                  tag={eventTag.toUpperCase()}
                  title="Your spot is ready."
                  subtitle="One last step to join your field."
                />
                <div className="registration-ticket-body">
                  <AppHeading>{detail.name} Meet</AppHeading>
                  <div className="registration-ticket-rows">
                    {ticketRows.map(row => (
                      <div key={row.label}><AppText role="caption" secondary>{row.label}</AppText><AppText role="label">{row.value}</AppText></div>
                    ))}
                  </div>
                  <TicketStub status="READY TO CLAIM" barcode={barcode} />
                  <button
                    type="button"
                    className="fb-btn"
                    disabled={claimPending || claimed}
                    onClick={() => { setClaiming(true); onClaim(); }}
                  >
                    {claimPending ? "Claiming your spot…" : "Claim your spot"}
                  </button>
                </div>
              </div>

              <div className="registration-face registration-back" inert={!claimed} aria-hidden={!claimed}>
                <TicketHeader
                  event={event}
                  tag="CONFIRMED ENTRY"
                  title="You’re on the start list."
                  subtitle={detail.headline}
                />
                <div className="registration-ticket-body">
                  <div className="registration-ticket-countdown">
                    <AppText role="caption" secondary>YOUR WAVE STARTS IN</AppText>
                    {claimed && <WaveCountdown start={detail.start} now={now} />}
                  </div>
                  <div className="registration-entry-stamp" aria-label={`${detail.name}, ${detail.dateRange}, ${detail.stampYear}`}>
                    <CompeteIcon name={event} size={30} />
                    <div>
                      <AppText role="label">{detail.name}</AppText>
                      <AppText role="caption">{detail.dateRange} · {detail.stampYear}</AppText>
                    </div>
                  </div>
                  <TicketStub status="CONFIRMED" barcode={barcode} />
                  <button type="button" className="fb-btn" onClick={onView}>
                    View {Date.parse(detail.start) > now.getTime() ? "upcoming race" : "race"} →
                  </button>
                </div>
              </div>
            </div>
            {!claimed && (
              <AppParagraph typographyRole="caption" className="registration-ticket-note ui-text-secondary">
                Your entry will be confirmed when you claim your spot.
              </AppParagraph>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {step === 0 && (
        <div className="registration-step-actions">
          <button type="button" className="fb-btn" onClick={() => setStep(1)}>Continue →</button>
        </div>
      )}

      <span className="sr-only" role="status">{registered ? "You’re on the start list." : ""}</span>
      {error && <AppParagraph typographyRole="caption" role="alert">{error}</AppParagraph>}
    </div>
  );
}
