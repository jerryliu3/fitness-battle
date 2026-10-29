import { Suspense } from "react";
import { ExperienceLab } from "@/features/experience-lab/experience-lab";
export default function ExperienceLabPage() {
  return <Suspense fallback={<p>Loading concepts…</p>}><ExperienceLab /></Suspense>;
}
