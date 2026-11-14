import type { Metadata } from "next";
import { VitalsLabProductPage } from "./vitals-lab-product";

export const metadata: Metadata = {
  title: "Overtaek · Vitals Lab",
  description: "Interactive biometric body scan for the Health Lab.",
};

export default function Page() {
  return <VitalsLabProductPage />;
}
