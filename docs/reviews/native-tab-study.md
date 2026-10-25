# Native tab exploration — review index

31 original React Native compositions, implemented in the requested order.
Each tab was completed, verified and opened as a PR before starting the next.
These extend [Home #328](https://github.com/jerryliu3/fitness-battle/pull/328)
with more substantial nested navigation. All data is fictional and isolated;
no production layout, tracker connection, scoring or account rule changes.

| Review | Count | Expo route | PR / merge order |
| --- | --- | --- | --- |
| [Compete](native-compete-concepts/README.md) | 9 | `/study-compete` | [#340](https://github.com/jerryliu3/fitness-battle/pull/340) · first |
| [Progress](native-progress-concepts/README.md) | 9 | `/study-progress` | [#341](https://github.com/jerryliu3/fitness-battle/pull/341) · second |
| [Crew](native-crew-concepts/README.md) | 9 | `/study-crew` | [#342](https://github.com/jerryliu3/fitness-battle/pull/342) · third |
| [Profile](native-profile-concepts/README.md) | 4 | `/study-profile` | [#343](https://github.com/jerryliu3/fitness-battle/pull/343) · fourth |

PRs are stacked so each diff contains its tab, rather than repeating the shared
kit. Review and merge from Compete through Profile. The final branch includes
the complete set and a native `/study` hub.

```sh
pnpm install --frozen-lockfile
OVERTAEK_STUDY_PREVIEW=1 pnpm --filter @fitness-battle/mobile exec expo start --web --localhost --port 8083
```

Open `http://localhost:8083/study`. A matching Expo development build can use
`overtaek:///study`. The existing `pnpm --filter @fitness-battle/mobile study`
script uses port 8081; 8083 avoids another local checkout using that port.
There is no Next.js deployment route for these native studies.

Every study has focus/compare modes, a session-local shortlist and a concept
description/tradeoff. Use `?concept=<id>` or `?compare=1`. Each phone frame has its
own scrollable root. Native full-screen detail Modals keep parent roots mounted;
Back returns one level and Done closes the detail stack. The illustrative tab
bar is orientation, not live cross-tab navigation. Use the study hub for that.

## Scope of the exploration

- Compete: field → athlete → counted session; settled week → final board → receipt.
- Progress: range → bucket → activity; metric → trend; record → source; month → weeks.
- Crew: shared visual → contributors → member → sessions; plan → RSVP preview.
- Profile: public identity/highlights; owner edit → local save; settings → account
  destinations; local visibility → public/share preview.

Best first comparisons: Standings / Chase / Season Ribbon; Portfolio / Calendar /
Chapters; Journey / Constellation / Clubhouse; Athlete Card / Passport. These are
review starting points, not recommendations to merge a layout into production.

Review docs record reference decisions, cost of each structure and screenshots.
Unit/navigation tests use rendered native components with host mocks; browser
screenshots are Expo web. iOS exports compile Hermes bundles. Neither replaces
installed-device accessibility, keyboard or gesture QA.
