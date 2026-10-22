# October 21 repair review

The follow-up is stacked on the merged material/interaction feature series. Web and native use the same chart geometry, relay proportions, draft validation, and lane SVG model.

## Addressed

- Crew: dimensional woven relay tape, inspectable contributions, current-member selection, visible target gate where a real goal exists. Signed-out sport IDs remain canonical and the guest page renders normally.
- Progress: dated PR staircase including single-record standing lines, compact distance controls, numeric field size, grouped effort receipts.
- Compete: removed forced return redirects and counted/Got it acknowledgement panels. Result recap is explicit only, including after a fresh visit. Social actions identify the selected athlete; a one-person list has no selector.
- Start Line: heading focus, explicit empty name field, duration chips, actionable validation, local account/crew-scoped demo lifecycle. Live writes continue through the existing authenticated RPCs.
- Recovery and feedback: clear rest week in place, Eastern calendar alignment, Undo session removal, explicit renewal status, copy/share feedback and Home sync feedback.
- Compatibility: /compete redirects to /arena; small-screen race tables explain horizontal scrolling and bound long names.

The legacy crew cheer feed remains retired; restoring it would reintroduce a removed product surface. Session editing is deferred because removal now has recovery through Undo.

## Verification

- Full monorepo suite: 650 tests passed, five pre-existing skipped tests. An additional native rest-week set/clear regression passed separately (651 passing tests across these runs).
- Full monorepo type checks; additional mobile type check after test-fixture updates.
- Web production build; iOS and Android Hermes bundle exports.
- Local PostgreSQL: additive rest RPC applied; rollback fixtures verify set/clear, membership/auth rejection, anonymous execute denial, and an Eastern Sunday/Monday boundary. Local security advisors returned no warnings.
- Local demo browser: dimensional relay, single-record 5K chart, form initial focus, missing-name validation, schedule/leave/rejoin, rest set/clear, deliberate result replay/dismiss/revisit, visible sync busy/result states, removal/undo with restored totals, and signed-out Crew rendering.

Live multi-member RSVP delivery and native device interaction were not exercised. No production database changes were applied.
