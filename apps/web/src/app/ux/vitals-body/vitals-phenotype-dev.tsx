"use client";

import { isLocalHost } from "@/lib/auth/design-access";
import { useCallback, useEffect, useState } from "react";
import type {
  VitalsPhenotypeFile,
  VitalsPhenotypeSliders,
} from "@/lib/vitals-phenotype";

type EditSex = keyof VitalsPhenotypeFile;

const SLIDER_KEYS: { key: keyof VitalsPhenotypeSliders; label: string }[] = [
  { key: "age", label: "Age" },
  { key: "muscle", label: "Muscle" },
  { key: "weight", label: "Weight" },
  { key: "height", label: "Height" },
  { key: "proportions", label: "Proportions" },
];

export function VitalsPhenotypeDev({ sex }: { sex: EditSex }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<VitalsPhenotypeFile | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVisible(isLocalHost(window.location.hostname));
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/dev/vitals-phenotype");
    if (!res.ok) return;
    const data = (await res.json()) as VitalsPhenotypeFile;
    setConfig({ male: data.male, female: data.female });
  }, []);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  if (!visible || !config) return null;

  const sliders = config[sex];

  function setSlider(key: keyof VitalsPhenotypeSliders, value: number) {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            [sex]: { ...prev[sex], [key]: value },
          }
        : prev,
    );
    setStatus(null);
  }

  async function save() {
    if (!config) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/dev/vitals-phenotype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as { ok?: boolean; regen?: string };
      if (!res.ok) {
        setStatus("Save failed");
        return;
      }
      setStatus(
        data.regen
          ? `Saved to body-pipeline/local/phenotype.json — run: ${data.regen}`
          : "Saved",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        marginTop: 20,
        paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <p style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.65, margin: 0 }}>
        LOCAL ANNY PHENOTYPE ({sex})
      </p>
      <p style={{ fontSize: 11, opacity: 0.55, margin: "6px 0 12px", lineHeight: 1.4 }}>
        Adjust MakeHuman/Anny macro sliders, save, then regenerate assets. Not exposed in
        production.
      </p>
      {SLIDER_KEYS.map(({ key, label }) => (
        <label
          key={key}
          style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, marginBottom: 10 }}
        >
          <span>
            {label}{" "}
            <span style={{ opacity: 0.6 }}>{sliders[key].toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={sliders[key]}
            onChange={(e) => setSlider(key, Number(e.target.value))}
          />
        </label>
      ))}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        style={{
          marginTop: 4,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #3fd6c5",
          background: "rgba(47,210,190,0.12)",
          color: "inherit",
          fontSize: 12,
          cursor: "pointer",
          width: "100%",
        }}
      >
        {busy ? "Saving…" : "Save phenotype.json"}
      </button>
      {status ? (
        <p style={{ fontSize: 11, marginTop: 10, lineHeight: 1.45, opacity: 0.85 }}>{status}</p>
      ) : null}
    </section>
  );
}
