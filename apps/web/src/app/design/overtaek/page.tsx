import type { Metadata } from "next";
import Link from "next/link";
import { Nunito_Sans } from "next/font/google";
import { LoadingPrototype } from "@/app/design/_studies/overtaek-lab/loading-prototype";

const type = Nunito_Sans({ subsets: ["latin"], weight: "900", variable: "--font-overtaek" });
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
      <LoadingPrototype />
    </main>
  );
}
