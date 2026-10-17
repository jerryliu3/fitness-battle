import type { Metadata } from "next";
import { BrandMotionStudy } from "@/app/design/_studies/brand-lab/motion-study";
export const metadata: Metadata = { title: "Overtaek · Ember loading comparisons", robots: { index: false, follow: false } };
export default function BrandMotionPage() { return <BrandMotionStudy />; }
