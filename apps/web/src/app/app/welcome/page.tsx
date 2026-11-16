"use client";

import { OnboardingFeatureTour } from "@/features/club/onboarding-feature-tour";


import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EMPTY_GUEST_INTRO, GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY,
  ONBOARDING_STEPS, ONBOARDING_TITLES, ONBOARDING_OVERTAKE_COPY, onboardingAthleteCard,
  guestIntroForAccount, SPORTS, type GuestIntroDraft, type OnboardingStep,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { AthleteCrest } from "@/features/athlete-card/athlete-crest";
import { OnboardingOvertake } from "@/features/club/onboarding-overtake";
import { OnboardingPotential } from "@/features/club/onboarding-potential";
import { readGuestIntroDraft } from "@/lib/guest-intro";
import { CountryCombobox } from "@/ui/country-combobox";
import { SportActivityIcon } from "@/ui/sport-activity-icon";
import { BackButton } from "@/ui/back-button";
import { AppHeading, AppParagraph } from "@/ui/section";
import "@/features/club/onboarding.css";

function Welcome({ preview }: { preview: boolean }) {
  const { user, loading, signUp } = useAuth();
  const { state } = useCompete();
  const router = useRouter();
  const top = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("sport");
  const [draft, setDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [cardDraft, setCardDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const authenticatedIntro = Boolean(user) && !preview;
  const steps: readonly OnboardingStep[] = authenticatedIntro ? ONBOARDING_STEPS.filter(s => s !== "account") : ONBOARDING_STEPS;
  const card = useMemo(() => onboardingAthleteCard(cardDraft), [cardDraft]);
  useEffect(() => {
    if (!preview && (loading || (user && !state))) return;
    let saved = preview ? null : readGuestIntroDraft();
    if (user && !preview && state) {
      let pending: string | null = null;
      try { pending = localStorage.getItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
      saved = guestIntroForAccount(saved, pending, user.email) ?? {
        sport: state.primary, name: user.displayName || state.name, city: state.city || "", countryCode: state.countryCode || "",
      };
    }
    setDraft(saved ?? EMPTY_GUEST_INTRO); setCardDraft(saved ?? EMPTY_GUEST_INTRO); setReady(true);
  }, [preview, loading, user?.id, Boolean(state)]);
  useEffect(() => {
    if (ready && !preview && !loading && !state?.onboardingCompleted) try { localStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [ready, draft, preview, loading, state?.onboardingCompleted]);
  useEffect(() => { top.current?.scrollIntoView({ block: "start" }); }, [step]);
  if (!ready || (!preview && (loading || (user && !state)))) return <AppParagraph>Loading…</AppParagraph>;

  const index = steps.indexOf(step);
  function saveCompletedIntro(pendingEmail: string) {
    const completed = { ...draft, introCompleted: true };
    setDraft(completed);
    localStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(completed));
    localStorage.setItem(GUEST_SIGNUP_PENDING_KEY, pendingEmail.trim().toLowerCase());
  }
  async function next() {
    setError(null);
    setCardDraft(draft);
    if (step === "athlete") {
      if (authenticatedIntro && user) {
        try { saveCompletedIntro(user.email); router.replace("/app/onboarding"); }
        catch { setError("Could not save setup on this device. Please try again."); }
        return;
      }
    }
    setStep(steps[index + 1]!);
  }
  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (preview) { router.push("/app/onboarding?preview=1"); return; }
    setBusy(true); setError(null);
    try {
      saveCompletedIntro(email);
      const result = await signUp({ email: email.trim().toLowerCase(), password, displayName: draft.name.trim() });
      if (result.error) { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); setError(result.error); return; }
      setPassword("");
      if (result.needsEmailConfirm) { setConfirmation(true); return; }
      router.replace("/app/onboarding");
    } catch (err) {
      try { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally { setBusy(false); }
  }
  const back = index > 0 ? <BackButton disabled={busy} onClick={() => setStep(steps[index - 1]!)} /> : null;
  return <section ref={top} className="onboarding fb-stack">
    <AppParagraph typographyRole="label">OVERTAEK</AppParagraph>
    <div className="onboarding-progress" role="img" aria-label={`Step ${index + 1} of ${steps.length}`}>
      {steps.map((s, i) => <span key={s} data-complete={i <= index} />)}
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
      <AppParagraph>{ONBOARDING_OVERTAKE_COPY}</AppParagraph>
      <OnboardingOvertake sport={draft.sport} name={draft.name} onComplete={() => void next()} onBack={() => setStep("sport")} />
    </>}
    {step === "growth" && <OnboardingPotential />}
    {step === "features" && <OnboardingFeatureTour sport={draft.sport} />}
    {step === "athlete" && <div className="onboarding-athlete">
      <AthleteCrest model={card} />
      <div className="fb-stack">
        <label className="fb-field">Display name<input autoComplete="nickname" value={draft.name} maxLength={80}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} onBlur={() => setCardDraft(draft)} /></label>
        <label className="fb-field">City (optional)<input autoComplete="address-level2" value={draft.city} maxLength={80}
          onChange={e => setDraft(d => ({ ...d, city: e.target.value }))} onBlur={() => setCardDraft(draft)} /></label>
        <CountryCombobox label="Country (optional)" value={draft.countryCode} onChange={countryCode => {
          setDraft(d => ({ ...d, countryCode })); setCardDraft(d => ({ ...d, countryCode }));
        }} />
      </div>
    </div>}
    {step === "account" && <>
      <AthleteCrest model={card} />
      <form className="onboarding-account" onSubmit={createAccount}>
        <label className="fb-field">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={confirmation} /></label>
        <label className="fb-field">Password<input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} disabled={confirmation} /></label>
        {confirmation && <AppParagraph role="status">Check your email to confirm your account and continue setup.</AppParagraph>}
        <div className="onboarding-actions">{back}<button className="fb-btn" type="submit" disabled={busy || confirmation || !email.trim() || password.length < 6}>{busy ? "Creating…" : "Create account"}</button></div>
      </form>
      <AppParagraph typographyRole="caption">By creating an account you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</AppParagraph>
    </>}
    {error && <AppParagraph role="alert">{error}</AppParagraph>}
    {step !== "account" && step !== "overtake" && <div className="onboarding-actions">
      {back}<button className="fb-btn" type="button" disabled={step === "athlete" && !draft.name.trim()} onClick={() => void next()}>{step === "features" ? "Create my athlete" : "Continue"}</button>
    </div>}
    {step === "sport" && !authenticatedIntro && <Link className="fb-btn-ghost" prefetch href={preview ? "/login?from=onboarding&preview=1" : "/login?from=onboarding"}>I already have an account</Link>}
  </section>;
}
function Entry() { return <Welcome preview={useSearchParams().get("preview") === "1"} />; }
export default function WelcomePage() { return <Suspense fallback={<AppParagraph>Loading…</AppParagraph>}><Entry /></Suspense>; }
