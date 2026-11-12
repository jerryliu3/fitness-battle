# Crew contracts, passports and Derby

All active crew members can configure these features. They do not grant a member
permission to register another athlete or alter their ordinary event results.

## Minimal persistence

Three additive tables extend `crews`; existing memberships and activities stay
unchanged. Relational columns carry ownership, bounds and scoring inputs. No
polymorphic entity table, duplicated activity ledger, per-member progress table,
or client-written award document is introduced. A composite foreign key keeps
a contract inside its own crew’s season; stamps inherit that ownership without
duplicating crew or season IDs.

| Table | Purpose |
| --- | --- |
| `crew_seasons` | Named, non-overlapping, configurable UTC start/end instants with a display timezone. |
| `crew_contracts` | One uncancelled objective per crew/period, including target, metric, sport, immutable roster and rule version. Replacements retain cancelled history. |
| `crew_passport_stamps` | Unique contract/code receipts whose crew and season are inherited from the contract. |

`period_kind` reuses the existing period enum, with explicit timezone and bounds;
the initial writer issues Eastern calendar weeks only. Metrics are canonical
`distance_m`, `moving_sec`, `sessions` or `contributors`. They do not change event
points or Elo. More cadences and rules can be introduced through versioned writers
without changing the receipt relationship. Stamp codes are strings, allowing
additional achievements without adding columns or one table per badge.

## Contracts and settlement

`set_crew_contract` snapshots active members, sport and the current Mon–Mon week.
A change appends a replacement and cancels its predecessor atomically. It requires
the previous contract ID, so two members cannot silently overwrite each other.
Recorded activity earlier in that same week counts for the snapshotted members.
Changing or leaving a crew later does not change an existing contract's roster.

The existing `private.competition_activity_rows` supplies accepted fact revisions
at the exclusive deadline, including its existing closing lock. The usual counted,
non-history, non-demo, non-stub and non-future eligibility rules apply. No direct
training-row query reconstructs a closed result. Counts and values remain exact.

An authorized passport read settles due contracts under the crew lock. Result
values are written once and receipts are unique by `(contract_id, code)`, making
repeated reads harmless. Goal attainment during the week shows “Reached”; stamps
are earned only at close. There is no dependency on a scheduled job or a client
clock, and no closed result changes because of a late import.

## Seasons and stamps

Season dates are entered as Eastern midnights and stored as half-open instants.
Adjacent seasons are allowed; overlapping seasons are rejected under the same
crew lock. Dates need not be eight weeks or align with a calendar quarter.
Contracts fully contained in a season earn its stamps. Creating a season can
associate an existing unsettled contract fully within its bounds, but never
reassigns settled history or backfills awards from old activities.

Version 1 earns `contract_finish` for meeting the objective and `full_crew` when
a completed objective also has a counted session from every snapshotted member. Receipts survive weekly
resets and contract replacements. The season-management and passport UI follow in the next stacked PR.
Deleting the crew removes its private program records with the crew lifecycle.

## Access and rollout

All three tables have membership-scoped SELECT RLS. Authenticated clients have no
INSERT, UPDATE or DELETE grants. Public RPCs authenticate and check active
membership, serialize writes on the crew, and use an empty search path; internal
progress and settlement helpers cannot be called by clients. Server routes use
the existing request client for both browser cookies and mobile Bearer auth.

Apply `20261111134237_crew_objectives_passports_derbies.sql` before deploying the
passport API and clients. This task only prepares the migration; it does not
apply it to a hosted database. `supabase/tests/crew-passport.sql`, the shared
Vitest cases and the API route cases accompany the change; they have not been run.

## Offline account behavior

Offline accounts use device-local program storage scoped by account and crew,
following the existing local Start Line behavior. Contract/season forms remain
functional; progress uses the local crew snapshot and stamps retain the last
observed closed-week outcome. These local records never enter authenticated RPCs
or global award/scoring tables. Live accounts use the backend exclusively; a
missing server migration is reported as unavailable server setup rather than a
request to reconnect an already signed-in athlete.
