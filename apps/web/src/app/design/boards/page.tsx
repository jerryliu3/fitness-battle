import type { Metadata } from "next";
import { BoardLab } from "@/app/design/_studies/board-lab/board-lab";

export const metadata: Metadata = {
  title: "Overtaek · Ground for your effort",
  description: "Session Tapestry, Distance Ribbon and Horizon Pursuit: three interactive Compete board prototypes.",
  robots: { index: false, follow: false },
};

export default function BoardStudyPage() { return <BoardLab/>; }
