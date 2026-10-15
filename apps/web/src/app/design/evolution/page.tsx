import type { Metadata } from "next";
import { Manrope, Nunito_Sans, Space_Grotesk } from "next/font/google";
import { EvolutionLab } from "@/ux/evolution-lab/evolution-lab";

const formType = Space_Grotesk({ subsets: ["latin"], variable: "--font-form" });
const evenType = Nunito_Sans({ subsets: ["latin"], variable: "--font-even" });
const currentType = Manrope({ subsets: ["latin"], variable: "--font-current" });

export const metadata: Metadata = {
  title: "Beyond Bounce · Design lab",
  description:
    "Four coherent sporting identities, a nine-lane distance track, and third-person Pursuit.",
  robots: { index: false, follow: false },
};

export default function EvolutionPage() {
  return (
    <div
      className={`${formType.variable} ${evenType.variable} ${currentType.variable}`}
    >
      <EvolutionLab />
    </div>
  );
}
