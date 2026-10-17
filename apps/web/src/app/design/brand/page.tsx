import type { Metadata } from "next";
import {
  Barlow_Condensed,
  Fraunces,
  IBM_Plex_Mono,
  Syne,
} from "next/font/google";
import { BrandGallery } from "@/app/design/_studies/brand-lab/brand-gallery";
import { parseSelection } from "@/app/design/_studies/brand-lab/catalog";

const condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-brand-condensed",
});
const serif = Fraunces({ subsets: ["latin"], variable: "--font-brand-serif" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-brand-mono",
});
const expressive = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-brand-expressive",
});
export const metadata: Metadata = {
  title: "Overtaek · Brand & Ember studio",
  description:
    "Ten brand territories, the current Ember, and three neutral product systems with a cosmetic Ember locker.",
  robots: { index: false, follow: false },
};

export default async function BrandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const initial = parseSelection(
    typeof query.concept === "string" ? query.concept : undefined,
    typeof query.view === "string" ? query.view : undefined,
  );
  return (
    <div
      className={`${condensed.variable} ${serif.variable} ${mono.variable} ${expressive.variable}`}
    >
      <BrandGallery initialSelection={initial} />
    </div>
  );
}
