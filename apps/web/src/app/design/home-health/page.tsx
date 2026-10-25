import type { Metadata } from "next";
import { HomeHealthStudy } from "./study";
export const metadata: Metadata = { title: "Overtaek · Home health concepts · Dials & Halos", robots: { index: false, follow: false } };
export default function Page() { return <HomeHealthStudy />; }
