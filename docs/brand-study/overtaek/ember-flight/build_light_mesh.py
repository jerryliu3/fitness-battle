"""Precompute a small rigid mesh; retain the approved WebP without modification."""
from pathlib import Path
from array import array
import base64
import json
import math
import struct

HERE = Path(__file__).resolve().parent
source = json.loads((HERE / "reference.json").read_text())
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
data = {
    "vertices": base64.b64encode(packed_vertices).decode(),
    "indices": base64.b64encode(packed_indices).decode(),
    "vertexCount": len(vertices), "triangleCount": len(triangles) // 3,
    "bufferBytes": len(packed_vertices) + len(packed_indices),
    "texture": source["texture"],
}
(HERE / "light-mesh.json").write_text(json.dumps(data, separators=(",", ":")))
print(f"{len(vertices)} vertices, {len(triangles) // 3} triangles; {data['bufferBytes']} bytes of mesh buffers")
