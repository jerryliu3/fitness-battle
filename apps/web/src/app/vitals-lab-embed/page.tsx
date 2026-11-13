"use client";

import dynamic from "next/dynamic";
import { buildAnalyticsLabModel } from "@fitness-battle/shared";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

const VitalsLabExperience = dynamic(
  () =>
    import("@fitness-battle/pursuit/vitals-lab").then((m) => m.VitalsLabExperience),
  { ssr: false },
);

export default function VitalsLabEmbedPage() {
  const params = useSearchParams();
  const appearance = params.get("appearance") === "light" ? "light" : "dark";
  const model = useMemo(
    () => buildAnalyticsLabModel("peak_build", "30d"),
    [],
  );

  return (
    <div
      style={{
        minHeight: "100dvh",
        margin: 0,
        padding: 0,
        background: appearance === "dark" ? "#0a161d" : "#f3f6f7",
      }}
    >
      <VitalsLabExperience embedded analytics={model} appearance={appearance} />
    </div>
  );
}
