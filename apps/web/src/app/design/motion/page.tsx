import type { Metadata } from "next";
import { MotionLab } from "@/app/design/_studies/overtake-motion/motion-lab";

export const metadata: Metadata = {
  title: "Overtaek · Motion playground",
  description: "Photo-combo overtakes, staggered logo races, and continuous afterimage studies, with the original twelve concepts preserved.",
  robots: { index: false, follow: false },
};

export default function MotionPage() {
  return <MotionLab />;
}
