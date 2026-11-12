# Vitals Lab body pipeline

MakeHuman-class meshes → normalized GLB → particle scan assets → Three.js renderer.

See [docs/setup.md](./docs/setup.md), [docs/architecture.md](./docs/architecture.md).

Quick start:

```bash
pip install -r body-pipeline/requirements.txt
pnpm bodies:generate
pnpm bodies:sync
pnpm dev
# http://localhost:3000/design/vitals-body
```
