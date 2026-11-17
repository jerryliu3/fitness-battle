"use client";
import { useMemo } from "react";
import { createOnboardingOvertakeMoment, defaultCompeteFieldView, onboardingOvertakeCourse, sportById, type SportId } from "@fitness-battle/shared";
import { CompetitionMoment } from "./competition-moment";

export function OnboardingOvertake({ sport = "running", name, photo, onOvertakeCountChange, onComplete, onBack }: { sport?: SportId; name?: string; photo?: string; onOvertakeCountChange?: (count: number) => void; onComplete: () => void; onBack?: () => void; }) {
  const moment = useMemo(() => createOnboardingOvertakeMoment(name, sport, photo), [name, sport, photo]);
  return <CompetitionMoment key={sport} embedded practice onOvertakeCountChange={onOvertakeCountChange} onBack={onBack} dimension={defaultCompeteFieldView(sport)}
    course={sportById(sport).gps ? onboardingOvertakeCourse : null} moment={moment} remaining={1}
    onConfirm={onComplete} />;
}
