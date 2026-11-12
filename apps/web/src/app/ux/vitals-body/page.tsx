import type { Metadata } from "next";
import { VitalsBodyDemo } from "./vitals-body-demo";

export const metadata: Metadata = {
  title: "Overtaek · Vitals Lab · Body scan demo",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VitalsBodyDemo />;
}
