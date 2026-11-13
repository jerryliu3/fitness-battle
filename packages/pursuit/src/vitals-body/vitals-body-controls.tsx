import type {
  AppearanceMode,
  BodyMeshSource,
  BodySex,
  FaceStyle,
  HealthSystem,
  QualityPreset,
  ViewPreset,
  VitalsBodyTuning,
  VizMode,
  ZoomPreset,
} from "./types";

export interface VitalsBodyControlProps {
  meshSource: BodyMeshSource;
  onMeshSource: (s: BodyMeshSource) => void;
  sex: BodySex;
  onSex: (s: BodySex) => void;
  mode: VizMode;
  onMode: (m: VizMode) => void;
  view: ViewPreset;
  onView: (v: ViewPreset) => void;
  zoom: ZoomPreset;
  onZoom: (z: ZoomPreset) => void;
  system: HealthSystem;
  onSystem: (s: HealthSystem) => void;
  appearance: AppearanceMode;
  onAppearance: (a: AppearanceMode) => void;
  faceStyle: FaceStyle;
  onFaceStyle: (f: FaceStyle) => void;
  quality: QualityPreset;
  onQuality: (q: QualityPreset) => void;
  tuning: VitalsBodyTuning;
  onTuning: (t: VitalsBodyTuning) => void;
  devTuning?: boolean;
}

function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
      <legend style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.7 }}>
        {label}
      </legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={value === opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: value === opt.id ? "1px solid #5fe8d6" : "1px solid #2a3a40",
              background: value === opt.id ? "rgba(47,210,190,0.15)" : "transparent",
              color: "inherit",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function VitalsBodyControls(props: VitalsBodyControlProps) {
  const slider = (
    key: keyof VitalsBodyTuning,
    label: string,
    min: number,
    max: number,
    step: number,
  ) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={props.tuning[key]}
        onChange={(e) =>
          props.onTuning({ ...props.tuning, [key]: Number(e.target.value) })
        }
      />
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Seg
        label="MESH"
        value={props.meshSource}
        onChange={props.onMeshSource}
        options={[
          { id: "anny", label: "Parametric" },
          { id: "mpfb2", label: "MPFB" },
        ]}
      />
      <Seg label="BODY" value={props.sex} onChange={props.onSex} options={[
        { id: "male", label: "Male" },
        { id: "female", label: "Female" },
      ]} />
      <Seg label="MODE" value={props.mode} onChange={props.onMode} options={[
        { id: "outline", label: "Outline" },
        { id: "cloud", label: "Cloud" },
      ]} />
      <Seg label="VIEW" value={props.view} onChange={props.onView} options={[
        { id: "front", label: "Front" },
        { id: "side", label: "Side" },
        { id: "back", label: "Back" },
        { id: "free", label: "Rotate" },
      ]} />
      <Seg label="ZOOM" value={props.zoom} onChange={props.onZoom} options={[
        { id: "full", label: "Full" },
        { id: "upper", label: "Upper" },
        { id: "lower", label: "Lower" },
      ]} />
      <Seg label="FACE" value={props.faceStyle} onChange={props.onFaceStyle} options={[
        { id: "mannequin", label: "Mannequin" },
        { id: "soft", label: "Soft" },
        { id: "natural", label: "Natural" },
      ]} />
      <Seg label="SYSTEM" value={props.system} onChange={props.onSystem} options={[
        { id: "full", label: "Full" },
        { id: "cardiovascular", label: "Heart" },
        { id: "respiratory", label: "Breath" },
        { id: "movement", label: "Movement" },
      ]} />
      <Seg label="THEME" value={props.appearance} onChange={props.onAppearance} options={[
        { id: "dark", label: "Dark" },
        { id: "light", label: "Light" },
      ]} />
      <Seg
        label="DENSITY"
        value={props.quality}
        onChange={props.onQuality}
        options={[
          { id: "high", label: "High" },
          { id: "medium", label: "Med" },
          { id: "low", label: "Low" },
        ]}
      />
      {props.devTuning ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span style={{ fontSize: 11, opacity: 0.6 }}>DEV TUNING</span>
          {slider("particleScale", "Particle size", 0.18, 0.85, 0.01)}
          {slider("opacity", "Opacity", 0.25, 0.95, 0.02)}
          {slider("brightness", "Brightness", 0.5, 1.35, 0.02)}
          {slider("glow", "Glow", 0.2, 1.1, 0.02)}
          {slider("edgeLight", "Edge light", 0, 1.2, 0.02)}
        </div>
      ) : null}
    </div>
  );
}
