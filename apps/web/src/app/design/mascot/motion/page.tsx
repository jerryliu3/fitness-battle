import type { Metadata } from "next";
import { ProductMotionStudy } from "@/app/design/_studies/mascot-studio/product-motion";
export const metadata: Metadata = { title: "Ember · Product motion", robots: { index: false, follow: false } };
export default function MotionPage() { return <ProductMotionStudy />; }
