import { FRONT, rigAt, type Pose } from "./rig";

/** Editable vector tracing of the supplied character, with a single gold body fill. */
export function Mascot({ className, pose = FRONT }: { className?: string; pose?: Pose }) {
  const rig = rigAt(pose);
  return <svg className={className} viewBox="0 0 320 360" aria-hidden="true" data-mascot="ember">
    <g data-puppet="" transform={rig.body}>
      <path data-body="" d={rig.path} fill="#ffca28" />
      <g data-face="" transform={rig.face} fill="#234739">
        <g data-eye="far" transform={rig.farEye}>
          <ellipse cx="126" cy="176" rx="12" ry="18" />
          <ellipse cx="130" cy="170" rx="3.6" ry="5" fill="#fffde9" />
        </g>
        <g data-eye="near">
          <ellipse cx="194" cy="176" rx="12" ry="18" />
          <ellipse cx="198" cy="170" rx="3.6" ry="5" fill="#fffde9" />
        </g>
        <path data-mouth="" d={rig.mouth} fill={rig.open > .25 ? "#713323" : "none"} stroke={rig.open > .25 ? "none" : "#234739"} strokeWidth="4.5" strokeLinecap="round" />
        <path data-tongue="" d="M 153 211 Q 162 207 171 214 Q 164 220 157 216 Z" fill="#ed8074" opacity={rig.open > .25 ? 1 : 0} />
      </g>
    </g>
  </svg>;
}
