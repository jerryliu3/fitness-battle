"""Derive mesh samples from approved artwork without changing the image.

Pillow and NumPy are used only to read its alpha channel. The texture is bundled
byte for byte. The distance field supplies an approximate padded 3D thickness.
"""
from pathlib import Path
import base64
import json
import math

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "apps/web/public/brand/mascots/star-ember.webp"
image = np.array(Image.open(SOURCE).convert("RGBA"))
alpha = image[:, :, 3]
height, width = alpha.shape
inside = alpha >= 128
distance = np.where(inside, 10000.0, 0.0)
diagonal = math.sqrt(2)
for y in range(1, height - 1):
    for x in range(1, width - 1):
        if inside[y, x]:
            distance[y, x] = min(distance[y, x], distance[y - 1, x] + 1,
                                 distance[y, x - 1] + 1,
                                 distance[y - 1, x - 1] + diagonal,
                                 distance[y - 1, x + 1] + diagonal)
for y in range(height - 2, 0, -1):
    for x in range(width - 2, 0, -1):
        if inside[y, x]:
            distance[y, x] = min(distance[y, x], distance[y + 1, x] + 1,
                                 distance[y, x + 1] + 1,
                                 distance[y + 1, x + 1] + diagonal,
                                 distance[y + 1, x - 1] + diagonal)

step = 3
samples_x = list(range(0, width, step)) + [width - 1]
samples_y = list(range(0, height, step)) + [height - 1]
grid_alpha = alpha[np.ix_(samples_y, samples_x)].astype(np.uint8)
grid_depth = np.rint(distance[np.ix_(samples_y, samples_x)] * 2).clip(0, 255).astype(np.uint8)
ys, xs = np.nonzero(inside)
data = {
    "width": width, "height": height,
    "center": [round(float(xs.mean()), 4), round(float(ys.mean()), 4)],
    "xs": samples_x, "ys": samples_y,
    "alpha": base64.b64encode(grid_alpha.tobytes()).decode(),
    "distance": base64.b64encode(grid_depth.tobytes()).decode(),
    "texture": "data:image/webp;base64," + base64.b64encode(SOURCE.read_bytes()).decode(),
}
target = Path(__file__).with_name("reference.json")
target.write_text(json.dumps(data, separators=(",", ":")))
print(f"Saved {target}: {target.stat().st_size} bytes; source texture unchanged")
