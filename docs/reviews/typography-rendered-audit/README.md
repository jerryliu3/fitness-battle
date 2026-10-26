# Rendered typography audit — October 25, 2026

Follow-up to #354, on main 07899d65. The first pass supplied the recipes but several real screen components still used label/display defaults, or newer markup missed legacy selectors. This pass changes role usage, preserving Manrope and the shared scale.

## Measured web results

Read browser computed styles on locally rendered demo screens (390px viewport), excluding inactive/inert panels. Screenshots are actual app captures, not design mocks.

| Element | Before | After |
| --- | --- | --- |
| Home / Progress / Compete primary title | 20/700 | 32/800 |
| Home weekly total | 32/800 | 48/800 |
| Section headings | 20/700 | 20/700 |
| Achievement quantities | 14/600, units combined | 28/700, separate 13/500 units |
| Best personal record | 32/800 | 48/800 |
| Record receipt | 14/600 time and date | 20/700 time, 13/500 date |
| Selected training bucket | 32/800 | 28/700 |
| Expanded standings names / totals | 14/600 / 14/600 | 17/600 / 20/700 |
| Latest activity date | 14/400 | 13/500 |
| Crew target / selected member | 14/600 / 14/600 | 20/700 / 17/600 |
| Crew shared total | 32/800 | 48/800, separate caption unit |
| Profile form labels | 16/400 | 13/600 |

Activity titles already used row 17; health values already used value 20. Athlete name already used display 32 and settings row titles used row 17. Settings descriptions now use support 14 rather than body 16. The compact effort rail score uses value 20 when shown. Chart/map axis labels intentionally retain caption sizing; controls retain label sizing.

## Native coverage and limits

Expo web rendered the actual native Home and Progress components at 320px: Manrope_800ExtraBold screen titles 32, hero total 48; Manrope_700Bold achievement counts 28; Manrope_500Medium units 13. Home title/actions wrap onto separate lines at this width. Document width equals viewport width. Native standings already had row/value mappings and were preserved. Native Crew targets and record receipts now match the web roles.

This is not a physical iOS/Android visual audit. The native preview had empty local data, so populated native records/Crew were inspected in source and validated by typecheck/tests/iOS export rather than claimed as visually verified. Expo web reports an existing `onLayout` warning; it was dismissed for the Home capture. Web captures use populated local demo data. No production data was changed.

## Evidence

- [Home before](home-before.png) / [after](home-after.png)
- [Progress before](progress-before.png) / [after](progress-after.png)
- [Expanded Compete standings](compete-after.png)
- [Crew before](crew-before.png) / [after](crew-after.png)
- [Native Home, 320px](native-home-after.png)
- [Native Progress, 320px](native-progress-after.png)

Coverage is the main screen hierarchy, expanded competition standings, Crew detail, and profile edit/settings. This does not assert every modal, account state, localization, device font scale, or 3D scene was exercised.

## Verification

- UI contract and monorepo typecheck pass.
- Web: 309 passed, 5 skipped; one sync coordinator test failed during the full run, then passed on focused rerun (8/8 including section hierarchy tests).
- Native: 144 tests pass.
- Production web build and iOS export pass.
