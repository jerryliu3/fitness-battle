import type { Metadata } from "next";
import localFont from "next/font/local";
import { EvolutionLab } from "@/app/design/_studies/evolution-lab/evolution-lab";

const formType = localFont({ src: "../../fonts/spacegrotesk/SpaceGrotesk[wght].woff2", weight: "300 700",  variable: "--font-form" });
const evenType = localFont({ src: "../../fonts/nunitosans/NunitoSans[YTLC,opsz,wdth,wght].woff2", weight: "200 900",  variable: "--font-even" });
const currentType = localFont({ src: "../../fonts/manrope/Manrope[wght].woff2", weight: "200 800",  variable: "--font-current" });

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
