import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DesignAccessGate } from "@/components/design-access-gate";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DesignLayout({ children }: { children: ReactNode }) {
  return <DesignAccessGate>{children}</DesignAccessGate>;
}
