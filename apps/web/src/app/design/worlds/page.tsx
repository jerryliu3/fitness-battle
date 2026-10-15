import type { Metadata } from "next";
import {
  Archivo_Black,
  Bangers,
  Outfit,
  Space_Grotesk,
} from "next/font/google";
import { WorldsLab } from "@/app/design/_studies/worlds-lab/worlds-lab";

const comic = Bangers({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-world-comic",
});
const broadcast = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-world-broadcast",
});
const rounded = Outfit({
  subsets: ["latin"],
  variable: "--font-world-rounded",
});
const music = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-world-music",
});

export const metadata: Metadata = {
  title: "Five product worlds · Design lab",
  description:
    "Flip, Rally, Roam, a rebuilt Loop and Tempo: five mascot-led interactive fitness concepts.",
  robots: { index: false, follow: false },
};

export default function WorldsPage() {
  return (
    <div
      className={`${comic.variable} ${broadcast.variable} ${rounded.variable} ${music.variable}`}
    >
      <WorldsLab />
    </div>
  );
}
