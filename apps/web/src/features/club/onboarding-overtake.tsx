"use client";
import { useMemo, useState } from "react";
import { createOnboardingOvertakeMoment, onboardingOvertakeCourse, sportById, type SportId } from "@fitness-battle/shared";
import { CompetitionMoment } from "./competition-moment";

export function OnboardingOvertake({ sport = "running", name, onComplete }: { sport?: SportId; name?: string; onComplete?: () => void } = {}) {
  const [dimension, setDimension] = useState<"2d" | "4d">("4d");
  const [replay, setReplay] = useState(0);
  const moment = useMemo(() => createOnboardingOvertakeMoment(name, sport), [name, sport]);
  const gps = sportById(sport).gps;
  return <div className="fb-stack">
    {gps && <div className="fb-chips" role="group" aria-label="Course view">
      <button className={`fb-chip${dimension === "2d" ? " on" : ""}`} type="button" aria-pressed={dimension === "2d"} onClick={() => setDimension("2d")}>2D field</button>
      <button className={`fb-chip${dimension === "4d" ? " on" : ""}`} type="button" aria-pressed={dimension === "4d"} onClick={() => setDimension("4d")}>3D course</button>
    </div>}
    <CompetitionMoment key={`${sport}:${replay}`} autoStart embedded dimension={gps ? dimension : "2d"}
      course={gps ? onboardingOvertakeCourse : null} moment={moment} remaining={1}
      onConfirm={onComplete ?? (() => setReplay(n => n + 1))} />
  </div>;
}
