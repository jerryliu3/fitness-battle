"""Rebuild the prototype's compact mesh from the approved artwork.

Preparation requires Pillow and NumPy; neither is a runtime dependency.
The separate texture remains unchanged. Depth is inferred from the alpha mask.
"""
from pathlib import Path
import base64
import struct
import math

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
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

source = data
alpha = base64.b64decode(source["alpha"])
distance = base64.b64decode(source["distance"])
cols, rows = len(source["xs"]), len(source["ys"])
vertices, triangles, cache = [], [], {}

def vertex(p):
    x, y, a, d, edge = p
    key = (round(x, 4), round(y, 4))
    if key in cache:
        return cache[key]
    idx = len(vertices)
    scale = 3.8 / source["height"]
    z = 0 if edge else .52 * math.sqrt(1 - math.exp(-d / 24))
    vertices.append(((x - source["center"][0]) * scale,
                     (source["center"][1] - y) * scale, z,
                     x / (source["width"] - 1), 1 - y / (source["height"] - 1)))
    cache[key] = idx
    return idx

def clip(points):
    out = []
    for i, a in enumerate(points):
        b = points[(i + 1) % 3]
        a_in, b_in = a[2] >= 128, b[2] >= 128
        if a_in:
            out.append(a)
        if a_in != b_in:
            t = (128 - a[2]) / (b[2] - a[2])
            out.append((a[0] + (b[0] - a[0]) * t,
                        a[1] + (b[1] - a[1]) * t, 128, 0, True))
    if len(out) >= 3:
        first = vertex(out[0])
        for i in range(1, len(out) - 1):
            triangles.extend((first, vertex(out[i + 1]), vertex(out[i])))

def sample(x, y):
    i = y * cols + x
    return (source["xs"][x], source["ys"][y], alpha[i], distance[i] / 2, False)

# Use every second existing sample: approximately six image pixels per cell.
xs = sorted(set(range(0, cols, 2)) | {cols - 1})
ys = sorted(set(range(0, rows, 2)) | {rows - 1})
for y0, y1 in zip(ys, ys[1:]):
    for x0, x1 in zip(xs, xs[1:]):
        a, b, c, d = sample(x0, y0), sample(x1, y0), sample(x1, y1), sample(x0, y1)
        clip((a, b, c))
        clip((a, c, d))

count = len(vertices)
front_indices = triangles[:]
vertices += [(x, y, -z * .9, -1 - u, v) for x, y, z, u, v in vertices[:]]
for i in range(0, len(front_indices), 3):
    a, b, c = front_indices[i:i + 3]
    triangles.extend((a + count, c + count, b + count))
assert len(vertices) < 65536
packed_vertices = b"".join(struct.pack("<5f", *v) for v in vertices)
packed_indices = struct.pack(f"<{len(triangles)}H", *triangles)

target = ROOT / "apps/web/public/brand/overtaek/ember-mesh.bin"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(struct.pack("<4I", 0x4b54564f, len(vertices), len(triangles), len(packed_vertices)) + packed_vertices + packed_indices)
print(f"Saved {target}: {target.stat().st_size} bytes")
