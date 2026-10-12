# Beyond Bounce review captures

Interact at `/design/evolution`. [Design rationale](../design-evolution.md) explains the identities and track behavior. [verification.json](verification.json) records browser checks. All scenes use synthetic data.

| Identity | My track                                                                | The field                                                               | Splits                                                                    | Athlete                                                                     |
| -------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| VOLT     | [Desktop](volt-track-desktop.png) / [Phone](volt-track-phone.png)       | [Desktop](volt-field-desktop.png) / [Phone](volt-field-phone.png)       | [Desktop](volt-splits-desktop.png) / [Phone](volt-splits-phone.png)       | [Desktop](volt-athlete-desktop.png) / [Phone](volt-athlete-phone.png)       |
| FORM     | [Desktop](form-track-desktop.png) / [Phone](form-track-phone.png)       | [Desktop](form-field-desktop.png) / [Phone](form-field-phone.png)       | [Desktop](form-splits-desktop.png) / [Phone](form-splits-phone.png)       | [Desktop](form-athlete-desktop.png) / [Phone](form-athlete-phone.png)       |
| EVEN     | [Desktop](even-track-desktop.png) / [Phone](even-track-phone.png)       | [Desktop](even-field-desktop.png) / [Phone](even-field-phone.png)       | [Desktop](even-splits-desktop.png) / [Phone](even-splits-phone.png)       | [Desktop](even-athlete-desktop.png) / [Phone](even-athlete-phone.png)       |
| CURRENT  | [Desktop](current-track-desktop.png) / [Phone](current-track-phone.png) | [Desktop](current-field-desktop.png) / [Phone](current-field-phone.png) | [Desktop](current-splits-desktop.png) / [Phone](current-splits-phone.png) | [Desktop](current-athlete-desktop.png) / [Phone](current-athlete-phone.png) |

[Four identity systems](identities-desktop.png) · [Pursuit at the starting line](pursuit-start-desktop.png) · [Third-person follow](pursuit-follow-desktop.png) / [Phone](pursuit-follow-phone.png) · [Avatar customization](pursuit-avatar-desktop.png) / [Phone](pursuit-avatar-phone.png).

Layouts were checked at 1440, 390, and 320 px. Actual WebGL initialization and absolute runner/camera movement were required for Pursuit verification. Native activity/group receipts, Escape/close controls, keyboard selection, what-if expansion beyond 30 km, replay milestones, reduced motion, and a WebGL-unavailable 2D fallback were exercised.
