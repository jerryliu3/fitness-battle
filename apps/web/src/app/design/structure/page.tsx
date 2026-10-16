import type { Metadata } from "next";
import { StructureLab } from "./structure-lab";

export const metadata: Metadata = {
  title: "Overtaek · Interface studio",
  description:
    "Five complete layout directions across Home, Arena, Crew, and Athlete.",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <StructureLab />;
}
