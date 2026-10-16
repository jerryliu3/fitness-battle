"""One-time glyph extraction: run with FontTools and skia-pathops installed, from the repository root.
Uses the already licensed/bundled Nunito Sans Black K; no font data is fetched.
"""
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.ttLib.removeOverlaps import removeOverlaps
import json, math
from pathlib import Path

font = TTFont("apps/mobile/node_modules/@expo-google-fonts/nunito-sans/900Black/NunitoSans_900Black.ttf")

# The font intentionally overlaps diagonal strokes. Union them before sampling;
# otherwise a short internal overlap becomes a folded edge during interpolation.
removeOverlaps(font, glyphNames=["K"])

class Outline(BasePen):
    def __init__(self, glyphs):
        super().__init__(glyphs)
        self.points = []
    def _moveTo(self, p): self.points.append(p)
    def _lineTo(self, p): self.points.append(p)
    def _qCurveToOne(self, a, b):
        p = self._getCurrentPoint()
        for i in range(1, 25):
            t = i / 24; u = 1 - t
            self.points.append(tuple(u*u*p[k] + 2*u*t*a[k] + t*t*b[k] for k in range(2)))
    def _curveToOne(self, a, b, c):
        p = self._getCurrentPoint()
        for i in range(1, 25):
            t = i / 24; u = 1 - t
            self.points.append(tuple(u**3*p[k] + 3*u*u*t*a[k] + 3*u*t*t*b[k] + t**3*c[k] for k in range(2)))
    def _closePath(self): pass

glyphs = font.getGlyphSet(); pen = Outline(glyphs)
glyphs[font.getBestCmap()[ord('K')]].draw(pen)
points = pen.points
x0, x1 = min(p[0] for p in points), max(p[0] for p in points)
y0, y1 = min(p[1] for p in points), max(p[1] for p in points)
scale = 288 / (y1-y0)
points = [(180 + (x-(x0+x1)/2)*scale, 345-(y-y0)*scale) for x,y in points]
area = sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points, points[1:]+points[:1]))
if area < 0: points.reverse()
points.append(points[0])
lengths = [0]
for a,b in zip(points,points[1:]): lengths.append(lengths[-1]+math.dist(a,b))
out=[]; j=0
for i in range(128):
    d=i*lengths[-1]/128
    while lengths[j+1] < d: j+=1
    t=(d-lengths[j])/(lengths[j+1]-lengths[j])
    out.append([round(points[j][k]+(points[j+1][k]-points[j][k])*t,3) for k in range(2)])
Path("packages/shared/src/mascot/k-outline.ts").write_text(
    "/** Nunito Sans 900 Black K, sampled from the bundled OFL font. Regenerate with scripts/extract-ember-k.py. */\n"
    + "/** Match the font's .705em cap height to the extracted outline's 288 units. */\n"
    + "export const EMBER_K_SIZE_EM = .705*360/288;\n"
    + "export const EMBER_K_OUTLINE: readonly (readonly [number, number])[] = " + json.dumps(out,separators=(',',':')) + ";\n")
