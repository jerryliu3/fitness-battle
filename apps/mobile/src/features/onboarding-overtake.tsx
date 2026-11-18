import { useMemo } from "react";
import { createOnboardingOvertakeMoment, defaultCompeteFieldView, ONBOARDING_REPLAY_TUNING, sportById, type CompetitionReplayTuning, type SportId } from "@fitness-battle/shared";
import { readOnboardingCourse } from "../lib/onboarding-course";
import { CompetitionMoment } from "./competition-moment";

export function OnboardingOvertake({ sport = "running", name, photo, onOvertakeCountChange, onComplete, onBack, replayTuning = ONBOARDING_REPLAY_TUNING }: { sport?: SportId; name?: string; photo?: string; onOvertakeCountChange?: (count: number) => void; onComplete: () => void; onBack?: () => void; replayTuning?: CompetitionReplayTuning; }) {
  const moment = useMemo(() => createOnboardingOvertakeMoment(name, sport, photo), [name, sport, photo]);
  const course = readOnboardingCourse();
  return <CompetitionMoment key={sport} replayTuning={replayTuning} embedded practice onOvertakeCountChange={onOvertakeCountChange} onBack={onBack} dimension={defaultCompeteFieldView(sport)}
    course={sportById(sport).gps ? course : null} moment={moment} remaining={1}
    onConfirm={onComplete} />;
}
