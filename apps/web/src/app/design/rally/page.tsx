import type { Metadata } from "next";
import { Archivo_Black, Bangers } from "next/font/google";
import { RallyFocus } from "@/ux/rally-lab/rally-focus";

const rallyType = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rf-display",
});
const comicType = Bangers({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rf-comic",
});

export const metadata: Metadata = {
  title: "Rally · The focused direction",
  description:
    "Rally's structure and Ace, Loop's small-move rings, and optional Flip-inspired highlights.",
  robots: { index: false, follow: false },
};

export default function RallyPage() {
  return (
    <div className={`${rallyType.variable} ${comicType.variable}`}>
      <RallyFocus />
    </div>
  );
}
