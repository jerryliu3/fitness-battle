import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { Ember2DPrototype } from "@/app/design/_studies/ember-2d/prototype";

const type = Nunito_Sans({ subsets: ["latin"], weight: "900", variable: "--font-overtaek" });
export const metadata: Metadata = {
  title: "Overtaek · 2D Ember studies",
  description: "Three fully 2D mascot concepts with the Overtaek overtaking animation.",
  robots: { index: false, follow: false },
};

export default function Ember2DPage() {
  return <div className={type.variable}><Ember2DPrototype /></div>;
}
