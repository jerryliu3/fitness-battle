import type { Metadata } from "next";
import { SpatialLab } from "@/ux/spatial-lab/spatial-lab";

export const metadata: Metadata = {
  title: "Spatial leaderboards · Fitness design lab",
  description:
    "Five interactive ways to compare weekly distance: pursuit, gaps, circuit, switchback, and replay.",
  robots: { index: false, follow: false },
};

export default function SpatialDesignPage() {
  return <SpatialLab />;
}
