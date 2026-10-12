# Spatial prototype review captures

Open `/design/spatial` to interact. These captures use Chromium with WebGL enabled and synthetic Thursday totals. The browser report is [verification.json](verification.json). Layouts were checked at 1440, 390, and 320 px; captures are retained at desktop and phone widths.

| Concept       | Desktop                               | Phone                         |
| ------------- | ------------------------------------- | ----------------------------- |
| Pursuit       | [POV world](pursuit-desktop.png)      | [Phone](pursuit-phone.png)    |
| Distance path | [Proportional path](path-desktop.png) | [Phone](path-phone.png)       |
| Circuit       | [3D track](circuit-desktop.png)       | [Phone](circuit-phone.png)    |
| Switchback    | [3D course](switchback-desktop.png)   | [Phone](switchback-phone.png) |
| Week replay   | [Milestone lanes](replay-desktop.png) | [Phone](replay-phone.png)     |

[Evaluation panel](evaluation-desktop.png) compares mechanisms, advantages, risks, and proposed user tasks. It is a design critique, not fabricated user research.

Camera, orbit, selection, unit conversion, ghost, what-if, replay, receipt, and path controls were exercised in the browser. Three world scenes were required to initialize WebGL; a flat fallback alone did not count as a successful 3D check. Screenshots capture authored meshes and real perspective rendering.
