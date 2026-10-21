import type { Metadata } from "next";
import { BoardLab } from "@/app/design/_studies/board-lab/board-lab";

export const metadata: Metadata = {
  title: "Overtaek · Find your ground",
  description: "Eight track environments, five progress treatments and two map zoom lenses for the vertical Compete field.",
  robots: { index: false, follow: false },
};

export default function BoardStudyPage() { return <BoardLab/>; }
