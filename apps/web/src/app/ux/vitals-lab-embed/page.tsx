"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const VitalsLabExperience = dynamic(
  () =>
    import("@fitness-battle/pursuit/vitals-lab").then((m) => m.VitalsLabExperience),
  { ssr: false },
);

/** WebView / iframe host for the Vitals Lab product shell (UX-only). */
export default function VitalsLabEmbedPage() {
  const params = useSearchParams();
  const initialAppearance =
    params.get("appearance") === "light" ? "light" : "dark";
  const [appearance, setAppearance] = useState<"dark" | "light">(
    initialAppearance,
  );

  useEffect(() => {
    setAppearance(initialAppearance);
  }, [initialAppearance]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        margin: 0,
        padding: "12px 0 20px",
        display: "grid",
        placeItems: "start center",
        boxSizing: "border-box",
        background: appearance === "dark" ? "#0a161d" : "#f3f6f7",
        transition: "background 220ms ease",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <VitalsLabExperience
          embedded
          appearance={appearance}
          onAppearanceChange={setAppearance}
        />
      </div>
    </div>
  );
}
