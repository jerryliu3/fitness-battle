# Individual-first concept review

Captured from the coded `/design` route at 1440 px and 390 px widths. Fixtures represent Thursday, October 15, 2026. These are presentation samples, not real activity or connections.

| Direction | Desktop | Phone |
|---|---|---|
| Split | [Track](split-desktop.png) | [Track](split-phone.png) |
| Bounce | [Completed-move trail](bounce-desktop.png) | [Completed-move trail](bounce-phone.png) |
| Folio | [Personal edition](folio-desktop.png) | [Personal edition](folio-phone.png) |
| Vector | [Interactive field](vector-desktop.png) | [Interactive field](vector-phone.png) |
| After | [Finite highlight reel](after-desktop.png) | [Finite highlight reel](after-phone.png) |

[Evaluation panel](evaluation-desktop.png) compares the actual mechanisms and proposed usability tasks. These are design hypotheses, not measured user-study results.

## Verification

- Monorepo `pnpm typecheck` passes.
- Full `pnpm test` passes after rebasing onto the latest main: 21 shared tests and 10 rankings tests. Web currently has no unit test files; prototype interactions were checked in the browser.
- Production `pnpm build:web` passes; `/design` is prerendered.
- Browser layout inspection: all 25 concept/view combinations at 1440, 390, and 320 px widths, **75 checks**. No detected content overflow, JavaScript errors, or failed local requests after fixes.
- Exercised Split's checkpoint and matching receipt, Bounce's completed-move receipt, Folio's comparison selector, Vector's keyboard selection and list fallback, After's direct/previous story controls, all five source walkthroughs, all five optional group joins, and evaluation navigation.
- Source walkthrough completion and group joining close their native dialog; Escape and explicit close work. Actions use local fixtures and do not call the fitness API.

The JSON report is in [verification.json](verification.json). Production scoring, SQL, API, and tracker behavior are unchanged by this study.
