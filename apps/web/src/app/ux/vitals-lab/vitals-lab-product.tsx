"use client";

import { VitalsLabExperience } from "@fitness-battle/pursuit/vitals-lab";

export function VitalsLabProductPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "24px 16px 48px",
        display: "grid",
        placeItems: "start center",
        background: "#0a161d",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <VitalsLabExperience />
      </div>
    </main>
  );
}
