# Overtaek color use study

[Open the light and dark palette lab](palette-lab.html). The active comparison is now **Stadium blue, Slate and Steel only**, matching the inline chat preview. Select the screen and appearance; yellow remains independently adjustable.

## Current direction: coordinated light and dark shades

The owner prefers Slate and Steel because their light and dark modes use distinct coordinated shades. Their light-mode accents are refined to be slightly lighter and more silver-toned; original dark-mode accents, feature fills and tinted panels are retained. Stadium blue remains the unchanged reference.

| Theme | Light-mode accent / feature | Dark-mode accent | Dark-mode feature |
| --- | --- | --- | --- |
| Stadium blue | `#245EA8` | `#8BB9F2` | `#253D61` |
| Slate | `#637580` | `#B7C7D4` | `#33424E` |
| Steel | `#62788A` | `#AABECE` | `#30414F` |

Use the same semantic mapping for all three: every secondary placement in Stadium blue receives the corresponding Slate or Steel shade. Shared dark/white text, neutral cards, light navigation in light mode, yellow actions and progress/distance bars retain their roles. Charts retain the secondary fill and original yellow current-day highlight. All active previews use the shared renderer and CSS; no theme-specific primary-ink overrides are introduced.

The previous Silver/Pewter and shade-range experiments are removed from the active preview. The sections below preserve research history and are superseded by this current direction. Production integration remains separate.

## Round four: vary brightness, hold undertone constant

The owner found the previous neutral options too similar: their prominent panels were all dark gray with small undertone differences. That feedback supersedes the prior shortlist. The new default comparison varies the feature surface value substantially, using one cool-neutral family:

| Shade | Feature surface | Text on feature |
| --- | --- | --- |
| Silver | `#E4E8EC` | Navy |
| Pewter | `#C2CBD3` | Navy |
| Mid gray | `#96A4B0` | Navy |
| Deep slate | `#5B6B79` | White |
| Charcoal | `#303D49` | White |

The same feature fill appears in both modes so the comparison reveals whether a pale panel or deep panel works better against each app canvas. Text tones adapt to the fill. Small secondary text and data marks use separately legible ink tones; they do not become pale on a white background. Yellow actions, layout and placement stay consistent. This corrects the prior restriction that effectively required all feature fills to be dark enough for white text.

## Round three: neutral secondary colors (prior comparison)

The owner prefers a neutral supporting palette, with Slate, Glacier and Stadium blue as reference points. Five additions keep the same color coverage and yellow action roles:

| Addition | Light secondary | Dark secondary | Evaluation |
| --- | --- | --- | --- |
| Steel | `#526A80` | `#AABECE` | Best fit to the stated preference: a muted midpoint between Slate and Stadium blue |
| Mineral | `#4D6C70` | `#A8C5C7` | A subdued blue-green alternative to Glacier |
| Graphite | `#535D66` | `#BDC6CC` | Closest to a true neutral; yellow carries more of the identity |
| Quiet navy | `#40566C` | `#A8BCD0` | A deeper, less saturated blue that relates closely to existing navy ink |
| Warm gray | `#65615B` | `#CCC5B9` | A subtle warm alternative; softer contrast with gold than the blue families |

My design judgment is to compare **Steel, Mineral and Graphite** first, using Current gold throughout. Steel offers the clearest middle ground, Mineral retains a slight field/outdoor association, and Graphite gives the cleanest yellow-led system. Warm gray is a useful boundary case but has less hue separation from yellow; Quiet navy is dependable but can make feature panels and navigation feel similar.

The original Slate, Glacier and Stadium blue colors are retained as exact reference points. Both appearance modes retain consistent neutral canvases so this round continues to isolate the supporting hue. Supporting text was darkened slightly after checking it on tinted panels; sampled foreground/background text pairs across all twelve palettes exceed 4.5:1. No production theme is selected by this study.

## Round two: controlled palette comparison

The owner favors the color coverage between Warm Highlights and Club Contrast, and wants light and dark mode supported from day one. The new lab holds the following jobs constant in every concept: warm neutral light canvas / navy dark canvas; plain data cards; dark navigation; yellow primary CTA and active tab; filled secondary feature panel; soft secondary panel; and secondary chart marks. Only the yellow shade and secondary hue family change. Every light concept has a coordinated dark partner, giving seven light and seven dark choices.

| Family | Light secondary | Dark secondary | Character |
| --- | --- | --- | --- |
| Alpine teal | `#176C75` | `#78CAC4` | Existing field identity |
| Stadium blue | `#245EA8` | `#8BB9F2` | Conventional athletic blue |
| Pine trail | `#286A50` | `#89CDA9` | Outdoor green |
| Glacier | `#0E6D89` | `#78CEE4` | Cool speed and data |
| Iris | `#654B8C` | `#C0A5E5` | Expressive competition |
| Berry | `#97456F` | `#E3A0C2` | Warmer social tone |
| Slate | `#4D606F` | `#B7C7D4` | Quieter secondary |

Five yellow candidates are independently selectable: current gold `#F7C948`, sunflower `#F5BF35`, citrine `#E9D645`, honey `#F1B94C`, and soft sun `#F8DB60`. Dark navy text on each yellow is at least 8:1 in the sample. The secondary colors used for small text are at least 4.5:1 on their respective surfaces; white text on each feature panel exceeds 5.8:1. These computed pairs meet the [WCAG AA normal-text threshold](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), though a production implementation still needs full-screen and state checks.

| Yellow candidate | Navy text contrast | Why it is here |
| --- | ---: | --- |
| Current gold `#F7C948` | 9.3:1 | Production baseline; recognizable Overtaek action color |
| Sunflower `#F5BF35` | 8.6:1 | Slightly warmer and more assertive |
| Citrine `#E9D645` | 9.9:1 | Cooler, sportier yellow-green edge without becoming lime |
| Honey `#F1B94C` | 8.2:1 | Softer golden warmth on dark and light surfaces |
| Soft sun `#F8DB60` | 10.6:1 | Gentler, lighter fill for a calmer home screen |

These five shades change the primary fill only. Labels stay navy, and secondary hues never take over the primary CTA. This separates the two choices the first study conflated: action yellow and supporting color.

The local Goalmaxxing `docs/ux/goalmaxxing-application-brand-guide.md` and `docs/ux/brand-round-atmospheres.md` supplied useful atmosphere ideas: Harbor's sea contrast, Ion's optimism, Contour's outdoor grounding, Summit Night's dark air and Riverstone's calm slate. The specific Goalmaxxing visual systems were not copied. Its rule to compare the same content across themes shaped this study. This preserves Overtaek's Manrope, current structure, yellow action role, and athletic identity; it avoids Gazetteer cream/terracotta and the prior Coaching indigo defaults.

[Apple's color guidance](https://developer.apple.com/design/human-interface-guidelines/color) calls for consistent meaning and separate light/dark variants. [Android's mobile color guidance](https://developer.android.com/design/ui/mobile/guides/styles/color) distinguishes accent, semantic and surface roles, with primary color on crucial actions. [Apple's iOS brand guidance](https://developer.apple.com/videos/play/wwdc2026/251/) suggests placing brand color in the content area and keeping controls legible over rich content. These sources support testing a stronger feature panel while holding dense data areas quiet.

**Shortlist to test first:** Alpine teal preserves existing field recognition; Stadium blue is the familiar sport alternative; Glacier makes metrics feel crisp without changing the action hierarchy. Use the same yellow shade while comparing these three, then tune yellow separately. The dark partner should ship with whichever light family is selected, rather than being treated as a later restyle.

## Audit

The selected Everyday Club system already defines navy `#142b3b`, yellow `#f7c948`, warm canvas `#f8f9f6`, white cards and teal `#176c75`. In the current mobile screens, yellow appears mainly in the selected tab, small progress areas and some field moments, while much of Home and Progress reads as navy and white. The screenshots supplied by the owner show a reasonable spectrum: Strava, Nike Run Club and AllTrails keep lists mostly neutral; Google Fit and Headspace use focused colored metrics/cards; WHOOP, Apple Fitness and Sweatcoin use saturated or dark environments. These are visual observations from the five supplied image boards, not claims about the apps' entire systems.

The shared `SHELL_COLORS` and web `.fb-btn` already define yellow primary buttons, and the native component guide calls for the same. The larger opportunity is consistent use of that role across page-specific actions and more deliberate color on progress, milestones and feature panels. The prototype therefore changes color allocation rather than proposing a second button system.

Apple's [color guidance](https://developer.apple.com/design/human-interface-guidelines/color) recommends consistent color meaning, clear background hierarchy and color on prominent actions. Its [brand identity guidance](https://developer.apple.com/videos/play/wwdc2026/251/) recommends putting brand color in content and using color to communicate hierarchy, grouping or interaction. [Android's color guidance](https://developer.android.com/design/ui/mobile/guides/styles/color) similarly assigns primary roles to crucial CTAs, secondary roles to lower emphasis, and surfaces to most of the screen. [WHOOP's first-party 2025 home redesign note](https://www.whoop.com/us/en/thelocker/everything-whoop-launched-in-2025/) highlights metrics at a glance as the home emphasis. Together with the supplied screenshots, these support yellow for primary actions, teal for progress/data and navy for identity or immersive surfaces. Keep quiet toolbar/navigation controls legible when content is colorful.

Two further first-party examples support selective color: [Strava's Training Log](https://support.strava.com/en-us/articles/15402077-training-log) uses different colors for sport types and activity tags, while [AllTrails' app page](https://www.alltrails.com/welcome) puts trail imagery and map content in the visual foreground. In the supplied screenshots, their surrounding lists and controls remain comparatively quiet. This is why the lighter choices spend color on actions and meaningful progress rather than every row.

Mobbin search was attempted for iOS fitness home and leaderboard screens, but the connection returned a paid-plan requirement. No Mobbin results inform this study.

## Five choices

| Choice | Canvas | Where color goes | Trade-off |
| --- | --- | --- | --- |
| 1. Action signal | Current warm white | All primary CTAs, selected tab, chart accent | Safest change; screen still feels restrained |
| 2. Warm highlights | Slightly warmer off-white | Pale yellow milestones, soft teal panels, yellow CTAs | Friendly without changing basic page structure |
| 3. Cool field | Pale teal across app | Teal feature card, white data cards, yellow CTAs | Clear background change; must check all sheets and empty states |
| 4. Club contrast | Neutral light | Navy feature cards and navigation, yellow CTAs, teal data | Strong athletic identity; dense content needs white surfaces |
| 5. Night arena | Dark navy across app | Lifted dark cards, teal data, yellow CTAs | Most immersive; needs a complete dark palette and contrast audit |

## Round one recommendation (superseded by the owner's light/dark direction)

The first review favored **2. Warm highlights** as a production candidate and **3. Cool field** as a background experiment. Round two instead holds coverage between Warm Highlights and Club Contrast, with paired light and dark palettes from day one.

## Implementation guardrails

- Primary actions use `#f7c948` with navy text; never use yellow for small text on white.
- Use one yellow filled action per decision area. Secondary actions stay outlined or neutral; navigation rows remain rows, and destructive actions retain red. This keeps yellow recognizable as an action.
- Teal remains the secondary data/competition color. Status success and error keep their own semantic roles.
- Selected tabs and progress states retain shape, labels or weight so color is not the only signal.
- If the app canvas changes, check sheets, status bars, tab bars, disabled controls, empty states and both native and web.
- Do not replace production tokens until a direction is selected. This is a presentation study, not a domain or scoring change.
