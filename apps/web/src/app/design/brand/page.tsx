import type { Metadata } from "next";
import localFont from "next/font/local";
import { BrandGallery } from "@/app/design/_studies/brand-lab/brand-gallery";
import { parseSelection } from "@/app/design/_studies/brand-lab/catalog";

const condensed = localFont({ src: [{ path: "../../fonts/barlowcondensed/BarlowCondensed-Bold.woff2", weight: "700", style: "normal" }, { path: "../../fonts/barlowcondensed/BarlowCondensed-ExtraBold.woff2", weight: "800", style: "normal" }, { path: "../../fonts/barlowcondensed/BarlowCondensed-SemiBold.woff2", weight: "600", style: "normal" }],
  variable: "--font-brand-condensed",
});
const serif = localFont({ src: "../../fonts/fraunces/Fraunces[SOFT,WONK,opsz,wght].woff2", weight: "100 900",  variable: "--font-brand-serif" });
const mono = localFont({ src: [{ path: "../../fonts/ibmplexmono/IBMPlexMono-Medium.woff2", weight: "500", style: "normal" }, { path: "../../fonts/ibmplexmono/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-brand-mono",
});
const expressive = localFont({ src: "../../fonts/syne/Syne[wght].woff2",
  weight: "700 800",
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
