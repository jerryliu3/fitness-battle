import type { Metadata } from "next";
import localFont from "next/font/local";
import { Ember2DPrototype } from "@/app/design/_studies/ember-2d/prototype";

const type = localFont({ src: "../../../fonts/nunitosans/NunitoSans[YTLC,opsz,wdth,wght].woff2",  weight: "900", variable: "--font-overtaek" });
export const metadata: Metadata = {
  title: "Overtaek · 2D Ember studies",
  description: "Three fully 2D mascot concepts with the Overtaek overtaking animation.",
  robots: { index: false, follow: false },
};

export default function Ember2DPage() {
  return <div className={type.variable}><Ember2DPrototype /></div>;
}
