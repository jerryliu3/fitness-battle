"use client";
import { useMemo, useState } from "react";
import { createOnboardingOvertakeMoment, defaultCompeteFieldView, onboardingOvertakeCourse, sportById, type SportId } from "@fitness-battle/shared";
import { CompetitionMoment } from "./competition-moment";

export function OnboardingOvertake({ sport = "running", name, onComplete, onBack }: { sport?: SportId; name?: string; onComplete?: () => void; onBack?: () => void; }) {
  const [replay, setReplay] = useState(0);
  const moment = useMemo(() => createOnboardingOvertakeMoment(name, sport), [name, sport]);
  return <CompetitionMoment key={`${sport}:${replay}`} autoStart embedded onBack={onBack} dimension={defaultCompeteFieldView(sport)}
    course={sportById(sport).gps ? onboardingOvertakeCourse : null} moment={moment} remaining={1}
    onConfirm={onComplete ?? (() => setReplay(n => n + 1))} />;
}
