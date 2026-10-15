import { useId } from "react";

export const concepts = [
  { id: "cel", name: "Cel Ember", label: "01", tag: "The closest evolution", description: "The familiar flame crest, warm gold and a clean shadow plane. Small details do the dimensional work.", body: "#ffcf42", shadow: "#f79a24", light: "#ffe98a", ink: "#234832" },
  { id: "puff", name: "Puff Ember", label: "02", tag: "The friendly challenger", description: "Rounder points, a little more cheek and a springy silhouette. Softer, without losing the competitive spark.", body: "#ffb54b", shadow: "#f67b36", light: "#ffda80", ink: "#563324" },
  { id: "bolt", name: "Bolt Ember", label: "03", tag: "The little athlete", description: "Swept points, a bold outline and a lime flash. A sharper, more athletic take on the same five-point character.", body: "#c2f366", shadow: "#87bd43", light: "#e6ffad", ink: "#263c2e" },
] as const;
export type Concept = typeof concepts[number]["id"];

const contours: Record<Concept, string> = {
  cel: "M 144 15 C 138 9 137 10 139 23 C 151 62 105 72 86 100 C 64 106 25 88 21 110 C 18 126 48 150 53 167 C 58 180 32 220 48 227 C 62 235 94 208 113 211 C 135 214 157 247 171 233 C 183 221 165 195 176 183 C 188 169 224 166 222 149 C 220 136 196 133 191 120 C 188 110 205 72 181 43 C 171 31 158 22 144 15 Z",
  puff: "M 135 22 C 125 12 121 18 124 30 C 129 56 103 73 87 91 C 71 103 36 86 25 105 C 12 126 44 145 49 163 C 53 178 29 211 44 224 C 60 239 92 216 111 214 C 133 213 158 244 177 229 C 193 215 172 192 181 178 C 191 163 225 168 228 148 C 230 128 201 126 193 113 C 187 100 200 78 182 54 C 170 39 151 34 135 22 Z",
  bolt: "M 151 12 C 143 8 140 12 143 22 C 151 47 113 75 91 99 C 68 104 32 90 23 105 C 16 116 49 148 54 164 C 59 181 32 219 46 227 C 58 235 96 204 112 207 C 135 210 160 243 174 230 C 185 220 167 190 177 180 C 192 165 229 164 226 149 C 224 137 196 131 192 119 C 189 106 203 79 188 54 C 180 38 165 22 151 12 Z",
};

/** Deform the complete contour, including the clip, rather than detaching any points. */
export function silhouetteAt(concept: Concept, tip = 0, limb = 0) {
  return contours[concept].replace(/(-?\d+) (-?\d+)/g, (_, xText: string, yText: string) => {
    const x = Number(xText), y = Number(yText);
    const crest = Math.max(0, (100 - y) / 90) ** 2;
    const edge = Math.min(1, Math.abs(x - 123) / 95);
    return `${(x - tip * 42 * crest - limb * 38 * edge).toFixed(2)} ${(y + tip * 9 * crest + limb * (y - 145) * edge).toFixed(2)}`;
  });
}

/** All art is editable SVG: solid fills, clipped shadow planes, and a separate face. */
export function Mascot({ concept, className }: { concept: Concept; className?: string }) {
  const id = `ember-${useId().replace(/:/g, "")}`;
  const c = concepts.find(item => item.id === concept)!;
  const path = silhouetteAt(concept);
  return (
    <svg className={className} viewBox="0 0 250 250" aria-hidden="true" data-mascot={concept}>
      <defs><clipPath id={id}><path data-contour="" d={path} /></clipPath></defs>
      <g data-puppet="" transform="translate(125 133) scale(1 1) translate(-125 -133)">
        <path data-contour="" d={path} fill={c.body} stroke={concept === "bolt" ? c.ink : "none"} strokeWidth="7" strokeLinejoin="round" />
        <g clipPath={`url(#${id})`}>
          <path d={concept === "puff" ? "M 10 126 Q 60 184 121 179 Q 190 182 235 135 L 252 260 L 0 260 Z" : "M 13 111 Q 59 169 106 183 Q 165 207 230 134 L 255 260 L 0 260 Z"} fill={c.shadow} />
          <path d={concept === "bolt" ? "M 149 25 Q 175 71 157 112 L 110 138 Q 150 84 149 25 Z" : "M 144 24 Q 176 64 155 101 Q 137 128 86 128 Q 143 87 144 24 Z"} fill={c.light} />
          {concept === "puff" && <path d="M 47 112 Q 60 105 79 113" fill="none" stroke={c.light} strokeWidth="9" strokeLinecap="round" />}
          {concept === "bolt" && <path d="M 49 113 L 81 119" fill="none" stroke={c.ink} strokeWidth="5" strokeLinecap="round" />}
          <g data-face="" fill={c.ink}>
            {concept === "puff" && <g fill="#ed7739" opacity=".6"><ellipse cx="91" cy="163" rx="13" ry="7" /><ellipse cx="166" cy="164" rx="13" ry="7" /></g>}
            <ellipse data-eye="left" cx="104" cy="143" rx={concept === "puff" ? 7 : 6} ry="11" />
            <ellipse data-eye="right" cx="153" cy="147" rx="6" ry="10" />
            <path d={concept === "puff" ? "M 118 164 Q 129 179 143 165 Q 130 186 118 164 Z" : "M 119 164 Q 131 174 144 165"} fill={concept === "puff" ? c.ink : "none"} stroke={c.ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            {concept !== "bolt" && <g fill="#fffbe7"><ellipse cx="106" cy="139" rx="1.7" ry="2.5" /><ellipse cx="155" cy="143" rx="1.5" ry="2" /></g>}
          </g>
        </g>
      </g>
    </svg>
  );
}
