import { MEDAL_GOLD } from "@fitness-battle/shared";

export function MedalGoldStyles() {
  return <style>{`
    @supports (color: color(display-p3 1 0 0)) {
      @media (color-gamut: p3) {
        :root { ${MEDAL_GOLD.cssVar}: ${MEDAL_GOLD.displayP3}; }
      }
    }
  `}</style>;
}
