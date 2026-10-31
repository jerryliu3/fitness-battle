# Mobile resume investigation

The block-list provider previously revalidated on every `active` event, including
returns from iOS `inactive` (system prompts and notification shade). It marked
privacy unready, causing the root BlockPrivacyGate to unmount the navigation
stack and any open native activity modal. A stalled block-list request had no
deadline, leaving a blank gate indefinitely.

The provider now loads on app startup, sign-in/account changes, and successful
block/unblock actions, with explicit Retry available after a failure. Returning
from the background does not reload the list or reset the privacy gate. The
complete paginated load has a 15-second deadline. Failure stays closed and exposes
the existing Retry / Sign out UI. The deadline covers waiting before HTTP dispatch
as well as the request itself. Late results cannot publish a successful snapshot.

Regression tests cover transient inactivity, stalled reload, recovery,
account changes and pagination. This is a code-level finding, not a confirmed
reproduction of all reported device freezes.

Remaining device verification: open an activity, background and return repeatedly;
repeat with airplane mode and expired authentication; dismiss a sheet while
backgrounding; verify touch response after returning. If freezes remain, capture iOS logs and thread stacks
before expanding the fix. A simulator/browser test alone cannot establish that
native touch interception or a main-thread hang is resolved.
