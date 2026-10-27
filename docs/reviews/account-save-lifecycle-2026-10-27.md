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
