"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  athleteCardModelForPeer, athleteLocationLine, EMPTY_GUEST_INTRO, GUEST_INTRO_DRAFT_KEY,
  GUEST_SIGNUP_PENDING_KEY, ONBOARDING_STEPS, ONBOARDING_TITLES,
  SPORTS, type GuestIntroDraft, type OnboardingStep,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { AthleteCrest } from "@/features/athlete-card/athlete-crest";
import { OnboardingOvertake } from "@/features/club/onboarding-overtake";
import { OnboardingPotential } from "@/features/club/onboarding-potential";
import { OnboardingFeatureTour } from "@/features/club/onboarding-feature-tour";
import { readGuestIntroDraft } from "@/lib/guest-intro";
import { CountryCombobox } from "@/ui/country-combobox";
import { SportActivityIcon } from "@/ui/sport-activity-icon";
import { AppHeading, AppParagraph } from "@/ui/section";
import "@/features/club/onboarding.css";

function Welcome({ preview }: { preview: boolean }) {
  const { user, loading } = useAuth();
  const top = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("sport");
  const [draft, setDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  useEffect(() => { setDraft(preview ? EMPTY_GUEST_INTRO : readGuestIntroDraft() ?? EMPTY_GUEST_INTRO); setReady(true); }, [preview]);
  useEffect(() => {
    if (ready && !preview && !loading && !user) try { localStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [ready, draft, preview, loading, user]);
  useEffect(() => { top.current?.scrollIntoView({ block: "start" }); }, [step]);
  if (!ready || (!preview && (loading || user))) return <AppParagraph>Loading…</AppParagraph>;

  const index = ONBOARDING_STEPS.indexOf(step);
  const name = draft.name.trim() || "Athlete";
  const sportName = SPORTS.find(s => s.id === draft.sport)!.name;
  const card = {
    ...athleteCardModelForPeer({ name, city: draft.city, sport: sportName }),
    countryCode: draft.countryCode || null,
    location: athleteLocationLine(draft.city, draft.countryCode || null),
  };
  function leave(signingIn = false) {
    if (preview) return;
    try {
      localStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(draft));
      if (signingIn) localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY);
    } catch {}
  }
  const next = () => setStep(ONBOARDING_STEPS[index + 1]!);
  return <section ref={top} className="onboarding fb-stack">
    <AppParagraph typographyRole="label">OVERTAEK</AppParagraph>
    <div className="onboarding-progress" role="img" aria-label={`Step ${index + 1} of ${ONBOARDING_STEPS.length}`}>
      {ONBOARDING_STEPS.map((s, i) => <span key={s} data-complete={i <= index} />)}
    </div>
    <AppHeading level={1} role="display">{ONBOARDING_TITLES[step]}</AppHeading>
    {step === "sport" && <>
      <AppParagraph>Choose a sport to try first. You can add more later.</AppParagraph>
      <div className="onboarding-sports">
        {SPORTS.map(sport => <button type="button" key={sport.id} className="onboarding-sport"
          aria-pressed={draft.sport === sport.id} onClick={() => setDraft(d => ({ ...d, sport: sport.id }))}>
          <SportActivityIcon sport={sport.id} size={40} /><strong>{sport.name}</strong>
        </button>)}
      </div>
    </>}
    {step === "overtake" && <>
      <AppParagraph>Make training fun: pass other athletes as you move. Join events with people near your level and keep each other motivated.</AppParagraph>
      <OnboardingOvertake sport={draft.sport} name={name} onComplete={next} />
    </>}
    {step === "growth" && <>
      <OnboardingPotential />
    </>}
    {step === "features" && <OnboardingFeatureTour sport={draft.sport} />}
    {step === "athlete" && <div className="onboarding-athlete">
      <AthleteCrest model={card} />
      <div className="fb-stack">
        <label className="fb-field">Display name<input autoComplete="nickname" value={draft.name} maxLength={80}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} /></label>
        <label className="fb-field">City (optional)<input autoComplete="address-level2" value={draft.city} maxLength={80}
          onChange={e => setDraft(d => ({ ...d, city: e.target.value }))} /></label>
        <CountryCombobox label="Country (optional)" value={draft.countryCode} onChange={countryCode => setDraft(d => ({ ...d, countryCode }))} />
      </div>
    </div>}
    {step === "account" && <>
      <AthleteCrest model={card} />
      <AppParagraph>Keep your athlete and build your record.</AppParagraph>
      <Link className="fb-btn" href={preview ? "/app/onboarding?preview=1" : "/signup"} onClick={() => leave()}>Create account</Link>
    </>}
    <div className="onboarding-actions">
      {index > 0 && <button className="fb-btn-line" type="button" onClick={() => setStep(ONBOARDING_STEPS[index - 1]!)}>Back</button>}
      {step !== "account" && step !== "overtake" && <button className="fb-btn" type="button"
        disabled={step === "athlete" && !draft.name.trim()} onClick={next}>{step === "growth" ? "Explore what else you can do" : step === "features" ? "Create my athlete" : "Continue"}</button>}
    </div>
    {(step === "sport" || step === "account") && <>
      <Link className="fb-btn-ghost" prefetch href={preview ? "/login?from=onboarding&preview=1" : "/login?from=onboarding"} onClick={() => leave(true)}>{step === "sport" ? "I already have an account" : "Sign in"}</Link>
    </>}
  </section>;
}

function Entry() {
  return <Welcome preview={useSearchParams().get("preview") === "1"} />;
}
export default function WelcomePage() {
  return <Suspense fallback={<AppParagraph>Loading…</AppParagraph>}><Entry /></Suspense>;
}
