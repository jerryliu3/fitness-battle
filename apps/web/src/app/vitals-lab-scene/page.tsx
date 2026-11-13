import type { Metadata } from "next";
import { VitalsLabScene } from "./scene";

export const metadata: Metadata = {
  title: "Vitals Lab body scan",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VitalsLabScene />;
}
