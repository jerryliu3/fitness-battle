import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { LoadingPrototype } from "@/app/design/_studies/overtaek-lab/loading-prototype";

const type = localFont({ src: "../../fonts/nunitosans/NunitoSans[YTLC,opsz,wdth,wght].woff2",  weight: "900", variable: "--font-overtaek" });
export const metadata: Metadata = {
  title: "Overtaek · Loading prototype",
  description: "Star Ember overtakes E: OVERTAKE becomes OVERTAEK.",
  robots: { index: false, follow: false },
};

export default function OvertaekPrototypePage() {
  return (
    <main className={type.variable} style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px", fontFamily: "var(--font-body), sans-serif" }}>
      <Link href="/design">← Design lab</Link>
      <h1 style={{ fontSize: 24, margin: "24px 0 8px" }}>Overtaek loading prototype</h1>
      <p style={{ marginBottom: 24 }}>OVERTAKE becomes OVERTAEK. Ember makes the pass.</p>
      <p style={{ marginBottom: 24 }}><Link href="/design/motion">New: compare 12 overtake moments, logo races, and motion wordmarks →</Link></p>
      <p style={{ marginBottom: 24 }}><Link href="/design/overtaek/2d">Explore three fully 2D Ember concepts →</Link></p>
      <LoadingPrototype />
    </main>
  );
}
