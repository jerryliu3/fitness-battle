import type { Metadata } from "next";
import { CompeteProvider } from "@/components/compete-context";
import { HomeLab } from "@/ux/home-lab/home-lab";

export const metadata: Metadata = {
  title: "Adaptive home · Fitness Battle",
  description: "Five mobile home concepts with direct interactions and a progress-first return reveal.",
  robots: { index: false, follow: false },
};

export default function HomePrototypePage() {
  return <CompeteProvider><HomeLab /></CompeteProvider>;
}
