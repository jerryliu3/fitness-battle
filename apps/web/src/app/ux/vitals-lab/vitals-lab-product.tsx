"use client";

import { buildAnalyticsLabModel } from "@fitness-battle/shared";
import { VitalsLabExperience } from "@fitness-battle/pursuit/vitals-lab";

export function VitalsLabProductPage() {
  const model = buildAnalyticsLabModel("peak_build", "30d");
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
      <div style={{ width: "100%", maxWidth: 430 }}>
        <VitalsLabExperience analytics={model} />
      </div>
    </main>
  );
}
