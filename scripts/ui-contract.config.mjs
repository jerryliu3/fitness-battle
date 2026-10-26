import fs from "node:fs";
import path from "node:path";

function collect(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? collect(file, extension) : file.endsWith(extension) ? [file] : [];
  });
}
const roots = [
  "apps/mobile/app", "apps/mobile/src/features", "apps/mobile/src/ui",
  "apps/web/src/features", "apps/web/src/components", "apps/web/src/ui",
  "apps/web/src/app/app", "apps/web/src/app/(auth)", "apps/web/src/app/(legal)",
];
// Artwork and historical design studies are not product typography.
export const files = roots.flatMap(root => collect(root, ".tsx")).filter(file =>
  !file.includes("/mascot/") && !file.endsWith(".test.tsx") && !file.endsWith("boot-splash.tsx") && ![
    "apps/mobile/app/mascot.tsx", "apps/mobile/app/structure.tsx",
    "apps/mobile/src/ui/section.tsx",
    "apps/web/src/ui/section.tsx",
  ].includes(file));
export const cssFiles = ["apps/web/src/app/globals.css", "apps/web/src/shell/shell.css", "apps/web/src/theme/themes.css",
  ...collect("apps/web/src/features", ".css"), ...collect("apps/web/src/ui", ".css")]
  .filter(file => !file.endsWith("boot-splash.css"));
