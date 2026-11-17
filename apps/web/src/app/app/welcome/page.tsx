"use client";

import { OnboardingFeatureTour } from "@/features/club/onboarding-feature-tour";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ONBOARDING_SPORT_TILES as sportTiles, EMPTY_GUEST_INTRO, GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY,
  ONBOARDING_STEPS, ONBOARDING_TITLES, isGuestPhoto, type OnboardingFeatureId, onboardingAthleteCard,
  guestIntroForAccount, sportById, SPORTS, type GuestIntroDraft, type OnboardingStep,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { OnboardingAthlete } from "@/features/club/onboarding-athlete";
import { uploadWebProfileAvatar } from "@/lib/profile/avatar-upload";
import { OnboardingOvertake } from "@/features/club/onboarding-overtake";
import { resolveSafePostLoginPath } from "@/lib/auth/login-redirect";
import { readGuestIntroDraft } from "@/lib/guest-intro";
import { BackButton } from "@/ui/back-button";
import { AppHeading, AppParagraph } from "@/ui/section";
import "@/features/club/onboarding.css";

function Welcome({ preview }: { preview: boolean }) {
  const { user, loading, signUp } = useAuth();
  const { state } = useCompete();
  const router = useRouter();
  const nextPath = useSearchParams().get("next");
  const nextQuery = nextPath ? `next=${encodeURIComponent(resolveSafePostLoginPath(nextPath))}` : "";
  const setupHref = `/app/onboarding${nextQuery ? `?${nextQuery}` : ""}`;
  const top = useRef<HTMLElement>(null);
  const accountId = preview ? undefined : user?.id;
  const waitingForProfile = !preview && (loading || Boolean(user && !state));
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("sport");
  const [draft, setDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [feature, setFeature] = useState<OnboardingFeatureId>("growth");
  const [previewScore, setPreviewScore] = useState<number | null>(null);
  const [previewPasses, setPreviewPasses] = useState(0);
  const showScore = useCallback((score: number) => setPreviewScore(Math.round(score / 50) * 50), []);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cardDraft, setCardDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [onboardingCourseRevision, setOnboardingCourseRevision] = useState(0);
  const authenticatedIntro = Boolean(user) && !preview;
  const steps: readonly OnboardingStep[] = authenticatedIntro ? ONBOARDING_STEPS.filter(s => s !== "account") : ONBOARDING_STEPS;
  const baseCard = useMemo(() => onboardingAthleteCard(cardDraft), [cardDraft]);
  const card = useMemo(() => ({ ...baseCard, score: previewScore, overtakes: previewPasses }), [baseCard, previewScore, previewPasses]);
  useEffect(() => {
    const timer = setTimeout(() => setCardDraft(draft), 120);
    return () => clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    if (waitingForProfile) return;
    let saved = preview ? null : readGuestIntroDraft();
    if (user && !preview && state) {
      let pending: string | null = null;
      try { pending = localStorage.getItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
      saved = guestIntroForAccount(saved, pending, user.email) ?? {
        sport: state.primary, name: user.displayName || state.name, city: state.city || "", countryCode: state.countryCode || "",
      };
    }
    setDraft(saved ?? EMPTY_GUEST_INTRO); setCardDraft(saved ?? EMPTY_GUEST_INTRO); setReady(true);
  }, [preview, accountId, waitingForProfile]);
  useEffect(() => {
    if (!ready || preview || loading || state?.onboardingCompleted) return;
    const timer = setTimeout(() => { try { localStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(draft)); } catch {} }, 600);
    return () => clearTimeout(timer);
  }, [ready, draft, preview, loading, state?.onboardingCompleted]);
  useEffect(() => { top.current?.scrollIntoView({ block: "start" }); }, [step]);
  useEffect(() => {
    if (!ready || !sportById(draft.sport).gps) return;
    void fetch("/api/routes/onboarding-course", { cache: "force-cache" })
      .then(response => (response.ok ? response.json() : Promise.reject()))
      .then(body => import("@fitness-battle/shared").then(({ prefetchOnboardingCourse }) => prefetchOnboardingCourse(async () => body)))
      .then(course => { if (course) setOnboardingCourseRevision(value => value + 1); })
      .catch(() => undefined);
  }, [ready, draft.sport]);
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
    if (step === "growth") {
      if (authenticatedIntro && user) {
        try { saveCompletedIntro(user.email); router.replace(setupHref); }
        catch { setError("Could not save setup on this device. Please try again."); }
        return;
      }
    }
    setStep(steps[index + 1]!);
  }
  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (preview) { router.push(`/app/onboarding?preview=1&sport=${draft.sport}`); return; }
    setBusy(true); setError(null);
    try {
      saveCompletedIntro(email);
      const result = await signUp({ email: email.trim().toLowerCase(), password, displayName: draft.name.trim() });
      if (result.error) { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); setError(result.error); return; }
      setPassword("");
      if (result.needsEmailConfirm) { setConfirmation(true); return; }
      router.replace(setupHref);
    } catch (err) {
      try { localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); } catch {}
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally { setBusy(false); }
  }
  const back = index > 0 ? <BackButton disabled={busy || photoBusy} onClick={() => setStep(steps[index - 1]!)} /> : null;
  return <section ref={top} className="onboarding fb-stack">
    <div className="onboarding-progress" role="img" aria-label={`Step ${index + 1} of ${steps.length}`}>{steps.map((s, i) => <span key={s} data-complete={i <= index} />)}</div>
    <OnboardingAthlete model={card} step={step} root={top} />
    <div className="onboarding-heading" data-compact={step === "overtake" || step === "growth"}>
      {step !== "growth" && <AppHeading level={1} role="display">{step === "athlete" ? `Welcome ${draft.name.trim() || "athlete"}!` : ONBOARDING_TITLES[step]}</AppHeading>}
      {(step === "overtake" || step === "growth") && <div data-card-slot className="onboarding-card-slot-small" />}
    </div>
    {step === "sport" && <>
      <AppParagraph>Choose your sport. You can add more later.</AppParagraph>
      <div className="onboarding-sports">
        {SPORTS.map(sport => <button type="button" key={sport.id} className="onboarding-sport"
          style={{ background: sportTiles[sport.id].background }} aria-pressed={draft.sport === sport.id} onClick={() => { setDraft(d => ({ ...d, sport: sport.id })); setStep("athlete"); }}>
          <span aria-hidden className="onboarding-sport-emoji" data-mirror={sportTiles[sport.id].mirror ? "true" : undefined}>{sportTiles[sport.id].emoji}</span><strong>{sport.name}</strong>
        </button>)}
      </div>
    </>}
    {step === "overtake" && <>
      <OnboardingOvertake key={onboardingCourseRevision} sport={draft.sport} name={draft.name} photo={draft.photo} onOvertakeCountChange={setPreviewPasses} onComplete={() => void next()} onBack={() => setStep("athlete")} />
    </>}
    {step === "growth" && <OnboardingFeatureTour draft={draft} selected={feature} onSelect={setFeature} onScoreChange={showScore} />}
    {step === "athlete" && <>
      <div data-card-slot className="onboarding-card-slot-large" />
      <label className="fb-field"><input aria-label="Athlete name" autoComplete="nickname" placeholder="Athlete name" value={draft.name} maxLength={80}
        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} onBlur={() => setCardDraft(draft)} /></label>
      <div className="onboarding-photo-row"><label className="onboarding-photo fb-btn fb-btn-secondary">{photoBusy ? "Reading photo…" : "Upload profile photo (optional)"}
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={photoBusy} onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = "";
          if (!file) return;
          setPhotoBusy(true); setError(null);
          try {
            const photo = await uploadWebProfileAvatar({ file });
            if (!isGuestPhoto(photo)) throw new Error("Choose a smaller photo.");
            setDraft(d => ({ ...d, photo })); setCardDraft(d => ({ ...d, photo }));
          } catch (err) { setError(err instanceof Error ? err.message : "Could not read that photo."); }
          finally { setPhotoBusy(false); }
        }} />
      </label>
      {draft.photo && <button className="onboarding-remove-photo" type="button" onClick={() => { setDraft(d => ({ ...d, photo: undefined })); setCardDraft(d => ({ ...d, photo: undefined })); }}>Remove photo</button>}</div>
    </>}
    {step === "account" && <>
      <div data-card-slot className="onboarding-card-slot-save" />
      <form className="onboarding-account" onSubmit={createAccount}>
        <label className="fb-field">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={confirmation} /></label>
        <label className="fb-field">Password<input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} disabled={confirmation} /></label>
        {confirmation && <AppParagraph role="status">Check your email to confirm your account and continue setup.</AppParagraph>}
        <div className="onboarding-actions">{back}<button className="fb-btn" type="submit" disabled={busy || confirmation || !email.trim() || password.length < 6}>{busy ? "Creating…" : "Continue"}</button></div>
      </form>
      <AppParagraph typographyRole="caption">By creating an account you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</AppParagraph>
    </>}
    {error && <AppParagraph role="alert">{error}</AppParagraph>}
    {step !== "sport" && step !== "account" && step !== "overtake" && <div className="onboarding-actions">
      {back}<button className="fb-btn" type="button" disabled={photoBusy || (step === "athlete" && !draft.name.trim())} onClick={() => void next()}>Continue</button>
    </div>}
    {step === "sport" && !authenticatedIntro && <Link className="fb-btn-ghost" prefetch href={`/login?from=onboarding${preview ? "&preview=1" : ""}${nextQuery ? `&${nextQuery}` : ""}`}>I already have an account</Link>}
  </section>;
}
function Entry() { return <Welcome preview={useSearchParams().get("preview") === "1"} />; }
export default function WelcomePage() { return <Suspense fallback={<AppParagraph>Loading…</AppParagraph>}><Entry /></Suspense>; }
