import type { Metadata } from "next";
import { HomeHealthStudy } from "./study";
export const metadata: Metadata = { title: "Overtaek · Five Home health concepts", robots: { index: false, follow: false } };
export default function Page() { return <HomeHealthStudy />; }
