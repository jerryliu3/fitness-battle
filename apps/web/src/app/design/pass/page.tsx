import type { Metadata } from "next";
import { PassLab } from "@/app/design/_studies/pass-lab/pass-lab";

export const metadata: Metadata = {
  title: "Overtaek · The art of the pass",
  description: "15 app icon directions and 8 vertical race fields exploring the moment of overtaking.",
  robots: { index: false, follow: false },
};

export default function PassPage() {
  return <PassLab />;
}
