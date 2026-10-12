import type { Metadata } from "next";
import { DesignLab } from "@/features/design-lab/design-lab";

export const metadata: Metadata = {
  title: "Five directions · Fitness design lab",
  description:
    "Explore five individual-first fitness experiences and brand systems.",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignLab />;
}
