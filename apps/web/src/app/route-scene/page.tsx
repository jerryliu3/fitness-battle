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
        <div
          role="status"
          style={{
            height: "100dvh",
            width: "100vw",
            background: "#142b3b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.2)",
              borderTopColor: "#f7c948",
            }}
          />
        </div>
      }
    >
      <RouteScene />
    </Suspense>
  );
}
