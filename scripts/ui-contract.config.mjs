import fs from "node:fs";
import path from "node:path";

// All production UI is checked. Historical studies and map renderers own their
// illustration/overlay geometry; the app-owned UI layer owns semantic type.
const roots = [
  "apps/mobile/app", "apps/mobile/src/features",
  "apps/web/src/features", "apps/web/src/components",
  "apps/web/src/app/(play)", "apps/web/src/app/(auth)", "apps/web/src/app/(legal)",
];
function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (file.includes("/components/routes/")) return [];
    return entry.isDirectory() ? collect(file) : file.endsWith(".tsx") ? [file] : [];
  });
}
export const files = roots.flatMap(collect).filter(file => ![
  "apps/mobile/app/mascot.tsx", "apps/mobile/app/structure.tsx",
].includes(file));

// Deliberate numeric scale exceptions; none are section or body text.
export const exceptions = {
  "apps/mobile/src/features/training-atlas.tsx": ['fontSize: 38', 'fontFamily: "DMSans_700Bold"'],
  "apps/mobile/src/features/competition-field.tsx": ['fontSize: 34', 'fontFamily: "DMSans_700Bold"'],
  "apps/mobile/src/features/session-stage.tsx": [
    'fontSize:stageWidth<300?36:stageWidth<340?42:48',
    'fontFamily:"DMSans_500Medium"', 'fontSize:48', 'lineHeight:54',
  ],
  "apps/mobile/src/features/week-chart.tsx": ['fontFamily: "DMSans_700Bold"', 'fontSize: 24'],
  "apps/mobile/src/features/club-rival-card.tsx": ['fontFamily: "DMSans_700Bold"', 'fontSize: 22'],
  "apps/mobile/src/features/effort-rail.tsx": ['fontFamily:"DMSans_700Bold"', 'fontSize:15'],
  "apps/mobile/src/features/crew-sessions.tsx": ['fontSize: 46'],
  "apps/mobile/src/features/result-card.tsx": ['fontSize: 64'],
  "apps/mobile/src/features/sync-review.tsx": ['fontSize: 42'],
};
