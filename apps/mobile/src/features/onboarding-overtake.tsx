import { useMemo, useState } from "react";
import { createOnboardingOvertakeMoment, defaultCompeteFieldView, onboardingOvertakeCourse, sportById, type SportId } from "@fitness-battle/shared";
import { CompetitionMoment } from "./competition-moment";

export function OnboardingOvertake({ sport = "running", name, photo, onOvertakeCountChange, onComplete, onBack, fill = false }: { sport?: SportId; name?: string; photo?: string; onOvertakeCountChange?: (count: number) => void; onComplete?: () => void; onBack?: () => void; fill?: boolean }) {
  const [replay, setReplay] = useState(0);
  const moment = useMemo(() => createOnboardingOvertakeMoment(name, sport, photo), [name, sport, photo]);
  return <CompetitionMoment key={`${sport}:${replay}`} autoStart embedded practice onOvertakeCountChange={onOvertakeCountChange} fill={fill} onBack={onBack} dimension={defaultCompeteFieldView(sport)}
    course={sportById(sport).gps ? onboardingOvertakeCourse : null} moment={moment} remaining={1}
    onConfirm={onComplete ?? (() => setReplay(n => n + 1))} />;
}
