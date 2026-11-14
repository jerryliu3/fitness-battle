import type { Metadata } from "next";
import { VitalsLabCanvasScene } from "./scene";

export const metadata: Metadata = {
  title: "Vitals Lab canvas",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VitalsLabCanvasScene />;
}
