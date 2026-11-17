"use client";
import { useMemo, useState } from "react";
import { createOnboardingOvertakeMoment, defaultCompeteFieldView, onboardingOvertakeCourse, sportById, type SportId } from "@fitness-battle/shared";
import { CompetitionMoment } from "./competition-moment";

export function OnboardingOvertake({ sport = "running", name, photo, onComplete, onBack }: { sport?: SportId; name?: string; photo?: string; onComplete?: () => void; onBack?: () => void; }) {
  const [replay, setReplay] = useState(0);
  const moment = useMemo(() => createOnboardingOvertakeMoment(name, sport, photo), [name, sport, photo]);
  return <CompetitionMoment key={`${sport}:${replay}`} autoStart embedded practice onBack={onBack} dimension={defaultCompeteFieldView(sport)}
    course={sportById(sport).gps ? onboardingOvertakeCourse : null} moment={moment} remaining={1}
    onConfirm={onComplete ?? (() => setReplay(n => n + 1))} />;
}
