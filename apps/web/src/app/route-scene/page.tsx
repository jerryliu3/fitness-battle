import { Suspense } from "react";
import type { Metadata } from "next";
import { RouteScene } from "./scene";

export const metadata: Metadata = {
  title: "Route 3D Flyover",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ height: "100dvh", width: "100vw", background: "#142b3b" }} />
      }
    >
      <RouteScene />
    </Suspense>
  );
}
