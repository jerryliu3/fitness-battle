# Account save lifecycle — items #8

The original generic message did not prove a pending edit. Native hydration called
`saveFailure()` solely because a persisted dirty bit existed. Both providers also
marked unchanged reducer results dirty. Web only persisted its dirty marker after
failed PUTs, so signing out during the debounce could leave a real edit unmarked.
Web retry reloaded instead of retrying PUT. An older request completing after a
sign-out/sign-in to the same ID could still publish its failure into the new lifecycle.

Both providers now avoid marking unchanged serialized snapshots dirty. Native
waits for the local snapshot/dirty write before scheduling upload, ignores orphan
dirty flags without a valid cache, and retries a cached draft after successful
hydration without presenting an invented failure. Web marks edits before debounce,
restores pending status at hydration, retries saved drafts and retries PUT on demand.
Native/web save callbacks capture the account lifecycle as well as account ID;
old failures and revisions cannot mutate a reloaded account. Version conflicts keep
the existing explicit reload and recovery-copy path.

Focused provider tests simulate sign-in, sign-out/sign-in during an in-flight save,
unchanged preferences, persisted-draft hydration and failed PUT/retry. This is a
local deterministic reproduction of the identified client causes, not a claim to
have reproduced a production server failure with a real account. No SQL, auth policy,
or server save path changed. Typecheck/full build and expensive tests were skipped.

## Deep-review corrections

Web hydration now distinguishes a successfully parsed cached snapshot from fresh
fallback state. A detached dirty bit cannot promote defaults into an uploadable
draft; both clients discard orphan dirty metadata before writing a replacement
cache. Web's optional dirty/revision writes and acknowledgements use guarded
storage helpers, so browser quota/security failures cannot abort an edit or turn
a successful server save into a failed save. Explicit conflict recovery still
requires a durable recovery backup before discarding the draft.

A persisted dirty snapshot represents a whole-document pending save. Both clients
preserve its units at hydration and through intervening refreshes until successful
acknowledgement, rather than requiring separate persisted per-field flags. The
loaded revision still blocks automatic writes over a newer server version.

Focused provider regressions cover absent/malformed/invalid cached snapshots with
orphan markers, storage-disabled edits plus failed-save/retry, and metric drafts
restored against US-unit server snapshots. All 10 web and 30 native provider tests
passed. No typecheck or expensive suite was run.
