import type { Metadata } from "next";
import { SmoothnessLab } from "@/app/design/_studies/smoothness-lab/lab";

export const metadata: Metadata = {
  title: "Motion & touch · Overtaek",
  description: "Eighteen interactive continuity and mobile haptic prototypes.",
};

export default function UxPage() {
  return <SmoothnessLab />;
}
