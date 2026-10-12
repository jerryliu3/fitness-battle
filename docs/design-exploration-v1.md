# A social fitness app: experience, style, and brand exploration

**Archived first pass.** The individual-first brief and coded concepts in [design directions v2](design-directions-v2.md) supersede this study's group emphasis and leading recommendation. Retained for its initial page inventory and research.

October 12, 2026 · Exploratory concepts, not a production design lock

## The opportunity

Make movement feel more meaningful because it happens alongside other people. The app's job is small: help someone find a group, connect their activity source, and see a week unfold. A successful visit can take twenty seconds. The emotional experience should be much larger than the interface.

The most promising starting point is **Clubhouse UX + Volt styling + Rally positioning**: warm, recognizable groups with a sharp athletic visual identity and a satisfying weekly competitive rhythm. Arena is the strongest alternative if competition is the primary acquisition hook. Chapter is the most distinctive alternative if personal continuity matters more than winning. Signal is the best fit for people who already use a tracker and want very little additional app time.

These are hypotheses to compare, not findings from testing this app with users. Research here covers published product flows, official design guidance, two physical-activity studies, the current repository, and the Goalmaxxing UX documentation. Names are creative working names; availability and trademark clearance have not been checked.

## Scope and the current app

At the start of this study, web pages were Today (`/`), Board (`/board`, including 1v1), Pace (`/pace`), You (`/you`, including connections), Race Rankings (`/rankings`), and a distance results page (`/rankings/[distance]`). Native combined several of these on one screen. Implementation work in other chats may advance this inventory independently.

This study provides **four concepts for each of twelve surfaces**. It splits some existing pages into conceptual surfaces so the join, connection, and recap journeys can be evaluated. That does not require twelve routes or twelve navigation tabs.

| Surface | Why someone opens it | Relationship to current app |
|---|---|---|
| First visit | Understand the promise and get into the right group | Proposed onboarding/invite entry |
| Home | See what changed and where I stand | Today |
| Find and join | Choose people or a board worth joining | Current sport opt-in, expanded conceptually |
| Create a group | Set up a small recurring group | Proposed sheet, not a main destination |
| Weekly board | Compare this week's activity within one group | Board |
| Head-to-head | Check one optional rivalry | Existing 1v1 section, usually a sheet |
| Activity and Pace | Understand what counted and inspect benchmarks | Pace plus synced activity history |
| Weekly recap | Feel the result and decide whether to return | Proposed period-close state |
| Profile | See my identity and history | You |
| Connections | Trust the data and resolve sync problems | Current You connections section |
| Race directory | Browse published race results | Race Rankings |
| Race results | Inspect a specific sourced result list | Distance results |

The four UX concepts are intentionally different in their **primary object**, default entry, information hierarchy, and reason to return. Their sample colors help communicate tone, but their interaction structures can use any of the visual themes below.

The Project Agent Store design/setup documents are referenced in the repository but are absent from this checkout and unavailable through this session's tools. The current CSS/mobile tokens are neutral and blue; AGENTS specifies an ink/lime athletic direction. This study uses that charter as the baseline, proposes alternate palettes explicitly, and avoids cream/terracotta and default indigo product chrome. It does not change existing tokens or domain rules.

## Research translated into design decisions

| Reference | What is supported by the source | Application here — a design inference |
|---|---|---|
| [Strava group challenges](https://support.strava.com/en-us/articles/15401736-how-do-group-challenges-work-on-strava) | Private challenges expose a timeframe and goal. Competitive formats and collective group goals use different progress models. | Show sport, score basis, period, visibility, and eligibility before joining. Keep one clear score basis per group. Collective goals are an optional future direction, not required for the leaderboard MVP. |
| [Strava challenge eligibility](https://support.strava.com/en-us/articles/15401916-strava-challenges) | Activity eligibility and visibility can affect whether progress appears on a challenge board. | Each activity needs a counted/pending/excluded explanation. A zero score should not silently imply the user did nothing. |
| [Runna navigation guide](https://support.runna.com/en/articles/10473504-your-quick-guide-to-navigating-the-runna-app) | Today, Plan, Progress, Calendar, and Profile organize immediate work, planning, history, and configuration. | Borrow clear destination jobs and accessible workout evidence. This simpler app needs roughly three primary destinations; it does not need to inherit a training-plan/calendar product. |
| [Duolingo Friend Streak](https://blog.duolingo.com/product-lessons-friend-streak/) | The team designed accountability around using the app alongside a friend without requiring a joint task. | Familiar faces can create a reason to return without chat, posting, or coordination. Crew recognition can be more useful than a social feed. |
| [Duolingo leagues](https://blog.duolingo.com/duolingo-leagues-leaderboards/) | Weekly competition is a recurring social ritual, with opt-out available. | Use a clear weekly opening/closing rhythm. Avoid making participation compulsory or covering every screen in rank pressure. |
| [Apple Activity sharing and competition](https://www.apple.com/ca/watch/close-your-rings/) | A compact visual object supports personal progress, sharing, and seven-day competitions. | One recognizable visual object can travel from Home to Board to Recap. We can use a lap, crew roster, chapter ribbon, or status tile without reproducing Apple's rings. |
| [Gentler Streak](https://gentlerstories.com/gentlerstreak) | Its published positioning emphasizes consistency, personal progress, and accommodating breaks. | Make quiet weeks and a lower placing feel ordinary. Do not create a daily exercise streak requirement or infer readiness from data we do not have. |
| [Shameli et al., WWW 2017](https://arxiv.org/abs/1702.07437) | Analysis of approximately 2,500 walking competitions found participant composition mattered; highly unequal matches weakened competition and its observed activity effect. | Arena should show nearby rivals and a comprehensible group rather than a demoralizing global rank. This observational result does not establish that any proposed layout improves retention or fitness. |
| [Zhang et al., 2016](https://escholarship.org/uc/item/97q266wf) | A randomized exercise-program study found social comparison more effective than social support in that setting. | Keep standings legible even in the warm Clubhouse direction. This study's class-attendance setting is not proof that one mechanism suits every consumer. |
| Goalmaxxing's [application design guide](/Users/jerryliu/Documents/Goalmaxxing/docs/ux/goalmaxxing-application-design-guide.md) and [experience guide](/Users/jerryliu/Documents/Goalmaxxing/docs/ux/goalmaxxing-experience-design-guide.md) | Existing project guidance separates IA, interaction craft, and brand; each destination has a clear purpose; interfaces use progressive disclosure and avoid an unbounded feed. | Bring over that discipline and interaction quality. This app's main object is a group/week, so its architecture and visual language should be its own. |

## Four interaction and experience systems

| | Arena | Clubhouse | Chapter | Signal |
|---|---|---|---|---|
| Core motivation | A close contest | People I know | My effort becomes a story | A reassuring check-in |
| Primary object | My position among nearby rivals | A crew with a weekly board | The current week in a continuing history | The latest meaningful change |
| First thing seen | Rank and adjacent competitors | Familiar faces and crew standings | A headline about this week | A concise status and sync receipt |
| Suggested navigation | Week · Boards · Activity; profile in header | Crews · Activity · You | Week · Circles · You | Now · Groups · You |
| Return trigger | A relevant rank change or weekly result | Someone familiar shows up; group week closes | A week gains another meaningful entry | Data arrives, a result closes, or something needs attention |
| Celebration | Place changes and final result | Crew recognition and shared results | A new chapter in a growing collection | A brief, optional result reveal |
| Main risk | Pressure or gaming the score | Empty groups and invite friction | Overdesigned storytelling or ornamental rewards | Too quiet to establish a habit |

### First visit — “Why should I connect and join?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: preview my field | A sample nearby-rival board with the user's future row visibly reserved. “Find my weekly board” opens a minimal sport selector, then a tracker explanation and board preview. | Leads with the competitive payoff before setup. Matching/calibration must be explainable; do not imply ability is already known. |
| Clubhouse: an invitation is the welcome | An inviter's name, crew identity, member faces, and this week's score rules. “Join Maya's crew” preserves this destination through account/connection steps. A generic entry offers Find a crew. | Trust comes from a relationship, not a feature tour. Works especially well through invite links; needs an honest path for people with no friends here. |
| Chapter: show a possible week | Three simple panels demonstrate activity arriving, a week filling in, and a result being saved. “Start my first week” asks for a sport and group after the promise is understood. | Explains the automatic loop through time. It can feel like too much onboarding; allow direct joining and skipping the preview. |
| Signal: one source, one group | “Connect once. Check when it matters.” Two explicit setup steps: choose a source, then a group. Explain exactly what is imported before authorization. | Makes low effort the value proposition. A sample board remains available so a provider permission request is not the first proof of value. |

### Home — “What changed since I last looked?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: the close contest | A large “4th of 12,” one positive/neutral movement indicator, and the two people directly above/below. Tap the nearest rival to open a comparison; tap View board for everyone. | Relative position dominates. Display real score gaps, not prescriptions such as “run 5 km to beat Maya.” Do not bury people outside the top three. |
| Clubhouse: my crew shelf | One featured crew with recognizable member faces, this week's short leaderboard, and a latest activity arrival. Other joined crews appear as simple rows. | Relationships dominate, with competition inside each crew. Keep updates finite; no composer, likes count, or infinite feed is necessary. |
| Chapter: the week in one sentence | “Three sessions. One good week.” A seven-day ribbon highlights synced entries; the weekly score and group position are secondary. Tapping a day opens its activity receipt. | Effort and continuity dominate. The ribbon logs existing activity; it is not a workout planner or a daily check-off obligation. |
| Signal: a calm status tile | “Your morning run counted.” A receipt, current place, and next period close occupy one compact block. If nothing changed, show the same useful state without invented news. | The app respects short visits. Sync time must be conspicuous enough that calm does not hide stale data. |

### Find and join — “Which group will feel right?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: a small set of matched boards | Sport first, then three candidate boards with size, current period, score basis, and a description of matching. Open a preview before committing. | Prioritizes comparable competition. Recommendations remain sample ideas until matching exists; avoid unsubstantiated “perfect match” percentages. |
| Clubhouse: people before filters | Invite link/code is prominent. Crew cards show names, a member roster, sport, and group tone. Only use friend membership as evidence when known and permitted. | Prioritizes familiarity and culture. No fake nearby geography or fabricated social proof; empty discovery offers a clear Create crew path. |
| Chapter: choose a cadence | A few recurring group formats—weekly runners, monthly riders, a custom event—with an example of the week/period recap. Inspect the format and choose a group. | Prioritizes the shape of commitment. Weekly is the MVP; other clocks are supported by the domain model but should not be implied to be fully implemented by these mocks. |
| Signal: one recommendation, one escape hatch | One group suggestion with its exact rules, then Browse groups and Enter invite code. The preview uses a compact sheet. | Reduces decision load. The suggested group must have a clear rationale, and browsing cannot be hidden behind setup. |

### Create a group — “Can I start this with friends quickly?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: format card | Pick a supported sport, inspect the score basis, choose weekly bounds and visibility, then name the board. A compact summary is shown before Create. | Treats creation as setting fair contest rules. Presets save time without offering arbitrary score equations. |
| Clubhouse: design our crew card | Name and a simple monogram/color treatment first; sport, weekly rules, and privacy underneath. Preview a membership card and generate an invite after creation. | Identity is the emotional hook. Decoration stays optional; one tap changes a preset, not a complex emblem editor. |
| Chapter: choose the next chapter | Start from a recurring weekly group or dated event. Show first period, sport, score rule, and group name in a narrative preview. | Frames a time-bounded commitment. Do not mix monthly/custom date controls into the default weekly flow. |
| Signal: a one-page setup | Name, sport, privacy, and a clearly labeled weekly default. All rules are visible in a compact summary. Create produces an invite sheet. | Practical and fastest to scan. Keep essential rules visible; “smart defaults” must not hide public sharing. |

### Weekly board — “Where do I stand with these people?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: around-me ladder | Center on You with adjacent competitors; toggle Full board for the complete ordered list. Emphasize place, names, score gaps, and period close. Tap a row for counted activity. | A race within reach is the focal point. Around-me cannot be the only list, and any rating projection must say it is provisional. |
| Clubhouse: crew roster | Crew name and faces above a legible full standings list. The user's row has one clear highlight. Tap an athlete to see permitted activity; private details stay private. | Everyone stays visible, making this a shared room rather than a global ladder. Avoid replacing numerical rank with vague encouragement. |
| Chapter: a week unfolding | Seven-day overview first; standings below. Inspect a day to see what contributed, or open the previous week's result. All cumulative scores still use the same group rule. | Adds time and causality. Additional timeline presentation is optional; it must not delay finding one's position. |
| Signal: my place, then everyone | A concise current-place line and last-refresh time above a compact list. Period rules are available through a labeled Details action. | Favors trust and fast reading. A compact layout still needs clear units and sufficient tap areas. |

### Head-to-head — “How is this one rivalry going?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: two-lane duel | Two labeled competitor lanes and proportional scores; the lead appears as a numeric gap. Inspect either athlete's eligible activity. Matching and invitation are quiet secondary actions. | Strong competitive theater. No countdown urgency beyond the real period boundary; use a comparison meter, not a simulated live race. |
| Clubhouse: friend face-off | Two names/portraits on a shared invitation card, with the same week and sport rule. Challenge again belongs on the final result. | A relationship first, game second. Head-to-head stays optional so invitations do not become an obligation. |
| Chapter: parallel weeks | Two aligned day ribbons show when each person's activity counted, with their current total below. Tap a day to inspect evidence. | The week tells the rivalry's story. Empty cells mean no imported activity, not failure or proof someone rested. |
| Signal: a quiet comparison | A small two-row score card, closing time, and latest counted entry. Open from the relevant group rather than a separate tab. | Provides rivalry with almost no extra chrome. Less theatrical, and therefore less suitable as the main brand promise. |

### Activity and Pace — “What counted, and what can I compare?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: score receipt | Activity list leads with score contributions and their status. A separate Pace view shows benchmark times and scope, with an explicit notice that pace standings do not change weekly rating. | Explains the contest's evidence. Never substitute km for effort points or present an estimated benchmark as a raced PB. |
| Clubhouse: contribution to my crew | Imported activities grouped by day, with a line identifying the group score they affected. Personal details remain distinct from what crew members can see. | Makes each workout socially meaningful. Do not suggest the same activity adds together across different scoring rules. |
| Chapter: movement journal | A weekly ribbon opens chronological entries; the current week can be compared with a previous week. Pace benchmarks are a clearly labeled secondary view. | A useful personal history without manual logging. Avoid turning it into a diary editor or training-plan interface. |
| Signal: import inbox | Recent arrivals labeled Counted, Pending, or Excluded. Opening an entry gives provider, observed timestamp, applicable period, and plain-language reason. | Optimizes confidence in automatic behavior. Operational detail belongs in the receipt, while the default remains compact. |

All four preserve the distinction between observed activity, calculated/estimated training benchmarks, and official race results. The existing Pace logic can scale longer efforts to a distance; such a value needs an **Estimated** label and must not be marketed as a verified race result.

### Weekly recap — “What should I feel about this week?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: the result reveal | Final place and score appear once the period closes. Show the rating change only if that feature is retained. A single short place transition gives closure; View result and Next week follow. | Gives competition a satisfying end. Pending imports or provisional results must be labeled; do not celebrate a forecast as final. |
| Clubhouse: the crew's weekly poster | Crew name, every member's placing, and one factual personal highlight. Share preview is optional; other members' identities require the group's sharing rules. | Creates a social souvenir, not a feed. Do not invent awards such as “most improved” without the underlying comparison. |
| Chapter: a page in my history | “Week 08” with activity count, score, and final place, saved into a sequence of past weeks. Open a week to inspect its receipts. | Builds continuity even when someone comes last. The week number is joined-week history, not a daily streak. |
| Signal: a concise weekly receipt | Final position, counted activity summary, source freshness, and a clear Next week state. No reveal animation unless opened deliberately. | Closes the loop without demanding attention. It needs enough warmth to avoid feeling like a system notification. |

### Profile — “Who am I here?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: competitor card | Name, sport, current rank band if retained, and past board results. Settings and connection status sit below. | A clear competitive identity. Keep raw rating secondary; a newcomer should not need to understand Elo to join. |
| Clubhouse: membership wallet | Name and joined crew cards, with past results and settings below. Open a card to return to that crew. | Identity comes from belonging. Separate private profile details from what appears on a group roster. |
| Chapter: my collected weeks | Name, sport, and an ordered history of weekly results. Open a chapter to inspect it; achievements are an optional future layer. | Progress becomes a collection. No speculative trophy economy is required; weekly history already has meaning. |
| Signal: identity and essentials | Small profile header, primary sport, connections, notification choices, privacy, and account settings in readable rows. | A straightforward utility destination. Personal history remains reachable so efficiency does not erase identity. |

### Connections — “Can I trust the automatic data?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: scoring eligibility | Provider status and a sample activity receipt show which group score types it can supply. Reconnect is offered only when required. | Connects setup to competitive fairness. “Verified” must refer to the actual evidence class, not a trust claim about the person. |
| Clubhouse: source to crew | A small receipt explains what the source imports and what the group sees. Permissions and group visibility are different controls. | Connects setup to social confidence. Joining a private crew must not silently publish routes, heart-rate data, or location. |
| Chapter: my activity archive | Explain what date range is imported, show import progress, then chronological entries with provenance. Calibration is a separate optional step if retained. | Makes the data history understandable. No fake calibration result, invented archive, or promised 90-day coverage. |
| Signal: explicit health state | Not connected → Connecting → Importing → Up to date. Also distinguish Delayed, Needs reconnect, No new activity, and Demo. Open status to see time and source evidence. | The strongest trust model. UI shows observed sync status, not inferred provider outages or readiness. |

In these visual prototypes, every provider state is labeled **Demo** or **Preview**. Strava is the charter's live integration path. Garmin, Apple Health, WHOOP, Oura, etc. are optional future-source ideas and must not be sold as connected integrations merely because placeholders exist in the repository. Demo actions never authorize a provider or transmit data.

### Race directory — “Which published results are available?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: record boards | Distance-led entries with explicit coverage and published-result counts. Choose a distance to inspect the sourced board. | Feels like a sporting record book. Do not imply global coverage; the actual dataset currently contains a limited event sample. |
| Clubhouse: events as gathering points | Event name and edition lead, with available distances beneath. Choose an event/distance pair. | Human context precedes raw times. Event grouping is proposed IA, not a claim that more events are currently loaded. |
| Chapter: an edition library | Compact dated editions, then distance. The header distinguishes official results from the user's synced activity history. | Frames race data as an archive. Sort and filters depend on actual metadata; keep missing coverage explicit. |
| Signal: a precise index | Distance, source event, coverage note, and last import timestamp when known. Empty distances say No results yet. | Makes the dataset's boundaries unmistakable. A sparse honest index should not be dressed up with fabricated count cards. |

### Race results — “What result is this, and where did it come from?”

| Concept | First viewport and interaction | Why it is distinct; tradeoff |
|---|---|---|
| Arena: timing sheet | Event/edition, distance, category, clock basis, then a crisp rank/name/time table. Tap a result to inspect source evidence. | Fastest route to comparison. Display chip versus official time correctly and retain attribution/license requirements. |
| Clubhouse: finisher roster | Event title, source coverage, and people-first rows with times and categories. Optional name search only when the list needs it. | Makes names more recognizable without inventing relationships. No auto-linking a public finisher to an app profile. |
| Chapter: archive edition | Edition title, source context, category sections, and timing rows with a receipt-style result detail. | A calmer archival presentation. Editorial flourish cannot conceal clock provenance or gaps in coverage. |
| Signal: plain sourced results | Compact semantic table, category control where supported, empty-state text, source link and attribution. | Clarity dominates. A small dataset should remain a small dataset, not acquire fictional global percentiles. |

## Five overall visual themes

The theme comparison uses the **same crew board and sample data** so typography, surface, color, and visual character can be judged independently of UX. Explore default light/dark behavior through the host; the palette definitions below specify the principal intended appearance. Semantic labels and contrast must remain valid in both.

### Volt — athletic signal

- **Palette:** ink `#101512`, lime `#D4FA45`, cool gray `#EEF1EC`; muted text `#667169` on light and `#A7B1AA` on dark.
- **Type:** compact, assertive display sans for headlines; clean DM Sans or platform sans for names and rules. Large tightly set numerals carry the hierarchy.
- **Shapes:** 16–22 px cards, mostly flat surfaces, short rule lines, a precise accent rail on the user's row. Lime is concentrated on the active object and primary action.
- **Motif:** lanes and start/finish marks. Use the motif sparingly on cover/result cards; names and scores stay unornamented.
- **Motion:** one place-change slide and a short score settlement. No constant glow, pulsing, or motion on a resting board.
- **Best fit:** Arena, or Clubhouse when we want warmth with a confident athletic edge. Closest to the charter.
- **Risk:** generic “neon gym app.” Differentiate with social faces, excellent lettering, and restraint rather than more gradients.

### Club Editions — a contemporary sports club

- **Palette:** clean white `#FCFDFB`, forest `#163C2C`, field green `#DCF1BD`, gray `#626D64`.
- **Type:** an expressive serif such as Fraunces for group identity; DM Sans/system sans for UI and all dense data. Serif stays out of timing columns.
- **Shapes:** generous margins, 20–28 px group covers, fine dividers, monogrammed crew cards, restrained membership-card material.
- **Motif:** modern club insignia, roster typography, edition/date stamps. No cream, terracotta, parchment, or faux heritage distressing.
- **Motion:** card expands to its crew roster; result feels like an edition being added, not a trophy explosion.
- **Best fit:** Clubhouse or Chapter; potential for apparel and distinctive share cards.
- **Risk:** becoming an exclusive country club. Use ordinary athletes, inclusive language, and many kinds of groups.

### Soft Play — adult-friendly joy

- **Palette:** crisp pale green `#F1F6F0`, deep ink `#15281A`, green `#D4F36B`, warm yellow `#F9D979`. Yellow is decorative; ink carries small text.
- **Type:** rounded sans such as Nunito Sans with confident scale. Simple, expressive numerals rather than game-font lettering.
- **Shapes:** 26–32 px rounded cards, pill controls, a tactile button base, soft characterful club initials. One accent color per action, not a rainbow roster.
- **Motif:** a small abstract loop character or changing club expression for joins, empty states, and recaps. It is an optional brand asset, not a companion feature requiring care.
- **Motion:** a brief settle/bounce on a successful join, reduced-motion alternative, optional result flourish.
- **Best fit:** Clubhouse, especially a broad casual audience; Chapter if weekly continuity is the hook.
- **Risk:** childishness or compulsive gamification. Borrow Duolingo's recognizability and feedback quality; do not inherit guilt, lives, or daily workout demands.

### Kinetic Studio — graphic movement culture

- **Palette:** white `#F7F8FC`, cobalt `#214CDA`, chartreuse `#D5EF57`, midnight `#142042`.
- **Type:** a geometric sans such as Space Grotesk with oversized type on crew covers; neutral system sans for details. Titles may align asymmetrically without rotating text.
- **Shapes:** rectangular poster blocks, a strong blue title panel, selective large rounded corners, narrow score bars. No indigo/shadcn visual defaults.
- **Motif:** cropped arcs and diagonal color fields used as brand graphics, never pretending to be a real route or activity chart.
- **Motion:** one graphic wipe when opening a recap; functional list transitions stay simple.
- **Best fit:** Arena with a younger social-athlete audience; Clubhouse for memorable crew identity and share graphics.
- **Risk:** style overtaking usability. Keep result tables, settings, and connection states calm.

### Quiet Current — premium, low-attention clarity

- **Palette:** mist `#EFF4F5`, dark ocean `#142E35`, teal `#0A7065`, soft mint `#D6F0E7`.
- **Type:** platform sans / DM Sans with spacious but compact hierarchy; medium-weight values, no huge trophy numbers.
- **Shapes:** 18–24 px calm opaque surfaces, generous row spacing, clear source/status labels. Accent appears where something is actionable.
- **Motif:** a single wave or progress line representing continuity. Avoid fake glass panels and decorative mini charts.
- **Motion:** short cross-state replacement; meaningful change can be static. Strongest reduced-motion experience.
- **Best fit:** Signal; Chapter for users who prefer understated personal progress.
- **Risk:** feeling like another generic wellness utility. Distinct wordmark, weekly result object, and human copy must carry the personality.

## Five brand concepts

These describe the promise and product framing, not just a name attached to a palette. Pairings are suggestions; a brand can use a different theme or UX.

| Working name | Positioning | Emotional hook | Functional framing | Natural pairing |
|---|---|---|---|---|
| **Rally** | Friendly competition that keeps your people moving | Shared momentum and playful bragging rights | Crews, weekly boards, optional face-offs | Clubhouse + Volt |
| **Gather** | A place for people who move together | Belonging and recognition | Membership, groups, weekly activity rosters | Clubhouse + Club Editions |
| **Loop** | Come back to movement, together | Continuity without perfection | Repeating group weeks, simple automatic entries, history | Chapter + Soft Play |
| **Arc** | See the athlete you are becoming | Personal momentum and identity | Weekly chapters, group benchmarks, result collection | Chapter + Kinetic Studio |
| **Tempo** | Your activity, quietly in sync with your people | Effortlessness and confidence | Automatic receipts, concise boards, weekly summaries | Signal + Quiet Current |

### Rally

**Promise:** “A little rivalry. A lot of momentum.” People already work out; Rally gives their activity a shared weekly meaning. Fitness is social without requiring a new workout routine or a posting habit.

**Visual identity:** decisive wordmark, a forward-leaning letter detail, crew initials, athletic ink/lime contrast. Real ordinary athletes and recognizable member faces provide warmth. The recurring weekly result card is the brand's most shareable object.

**Voice and vocabulary:** crews, this week, standings, counted, next round. “Your run is in. You're fourth in Sunday Miles.” Keep rivalry friendly; no “destroy your opponents,” battle metaphors, or claims about guaranteed fitness gains.

**Product consequence:** landing and invitation lead with a private group's board. The app remains useful without lessons, content, or a coach. Group scoring rules are visible before joining. This is the most direct expression of the brief, but weekly familiarity must be stronger than raw score chasing.

### Gather

**Promise:** “Find your people. Keep moving.” Fitness is framed as membership in a small circle: coworkers, friends, a neighborhood run group, or people with a shared sport.

**Visual identity:** group monograms, a contemporary sports-club roster, member cards, expressive group-name typography. Photography captures people between workouts as well as in motion; avoid an elite-only athlete aesthetic.

**Voice and vocabulary:** crew, members, this week's board, welcome back. “Maya's already here.” That line only appears when true. The result celebrates a recognizable group and still gives exact standings.

**Product consequence:** invitation entry, small crews, group switching, and member visibility are polished first. No chat, event scheduling, marketplace, or content feed is required. The growth risk is dependence on network density; solo entrants need a credible discovery path.

### Loop

**Promise:** “A good week is worth repeating.” The social group creates a lightweight rhythm; the product celebrates coming back rather than uninterrupted daily exertion.

**Visual identity:** a simple loop-shaped character/mark, soft tactile cards, weekly ribbons, friendly rounded type. The character has only a few expressive moments—joining, a first import, a completed week—and does not demand attention.

**Voice and vocabulary:** this week, back again, counted, another chapter. “One quieter week doesn't erase the others.” This is brand tone, not a proposal to change rating decay or freeze semantics.

**Product consequence:** recurring weeks, approachable invitations, readable automatic receipts, and a history of participation. Avoid a currency economy, daily workout streak, mandatory quests, or feeding a pet. The risk is feeling like a toy unless activity evidence and standings remain precise.

### Arc

**Promise:** “Every week adds to your story.” The app frames an ordinary athlete's progress as an evolving body of work, with groups giving that history context.

**Visual identity:** graphic arcs, striking geometric type, dated result covers, an archive of weekly cards. Big brand moments occur on joining and recaps; everyday boards stay legible.

**Voice and vocabulary:** weeks, chapters, effort, history. “Three sessions. Another week in the books.” Emphasize factual activity, not unsupported improvement or medical performance guidance.

**Product consequence:** week history and receipts gain prominence, optional benchmarks remain clearly labeled, and personal identity does not depend on podium finishes. A sophisticated result archive can be built from existing period data; a scoring redesign or elaborate achievement system is not prerequisite.

### Tempo

**Promise:** “Move as usual. Stay in the loop.” This app is a companion to trackers, offering only the social context and status those sources do not provide on their own.

**Visual identity:** quiet teal, precise typography, a simple waveform/wordmark detail, clean activity receipts. The core brand artifact is a trustworthy twenty-second summary, not a giant badge.

**Voice and vocabulary:** in sync, counted, your group, week closed, needs reconnect. “Your activity is up to date.” Only show this when observed; a mock state always says Demo.

**Product consequence:** connect, join, receive a short weekly summary. Notification choices are granular and optional. Sync failures get excellent recovery UX. The commercial challenge is explaining why a separate app is worth installing when the experience is intentionally small.

## Interaction craft shared by the concepts

- **The core loop:** invite/find → inspect rules → join → connect/import → see a counted activity → see the board → receive a period result → return next week. Previewing a board before connecting should be possible; the exact join/connect order can depend on invite versus generic entry.
- **Three primary destinations is the leading hypothesis:** groups/current week, activity/evidence, and identity/settings. Discovery and group creation are actions within Groups. Head-to-head, rules, receipts, and recap can be sheets/detail views. Race rankings remain a secondary published-data destination reachable from Pace.
- **One score, one label:** show effort points when the rule is effort. Show km only on a distance board. Keep rating, cumulative score, and benchmark time visually and verbally distinct. No new score mathematics are proposed here.
- **Clock clarity:** default bounds remain UTC Monday 00:00 to next Monday 00:00, half-open. Show a concise period label and an understandable local close time in Details. Do not silently adopt another app's Sunday/local-time reset. Daily/monthly/custom stay extendable rather than appearing as fully implemented features.
- **Touchable objects:** crew card opens crew; leaderboard row opens permitted activity evidence; activity row opens receipt; connection row opens provider status. Use labeled controls for join, leave, share, and rules. Decorative cards do not look tappable unless they do something.
- **Finite attention:** Home shows the current week and relevant changes. No endless feed, manual workout logging, lesson completion, AI coach, or daily content is required by this exploration.
- **Honest empty states:** not joined offers a board preview; joined but disconnected offers Connect; connected with no eligible activity explains the rule; delayed sync shows last successful import; demo says Demo. Do not show fake ranks in a first-run product.
- **Gentle competitive states:** last place still has readable evidence and week history. A quiet week does not require shame or alarms. Any existing freeze/rating behavior remains intact unless changed in a later domain decision.
- **Motion:** move rows only when real order changes; keep the user's context stable; result reveal happens once and can be skipped. Respect reduced motion. No continuous shine, particles, flashing status dots, or mandatory celebration.
- **Accessibility:** body text around 15–17 px, 44 px tap targets, visible focus, names that can wrap, score units, text labels for status, and sufficient contrast in both appearances. Color never carries rank/eligibility alone.
- **Desktop:** recompose into group/board on the left and selected receipt/history on the right. Onboarding centers the invitation preview beside setup. Race results use full-width tables with readable column spacing. A desktop app should not just enlarge a phone shell.

## How to compare and choose

Do not average all four concepts into one dashboard. Choose the primary reason people return, then borrow details that reinforce it.

**Leading combination:** Clubhouse gives this simple application a human center; Volt gives it modern athletic confidence; Rally makes the promise immediately understandable. Borrow Arena's nearby-rival view as a board option and Signal's connection status model. Keep Chapter's historical recap as a quiet secondary view. This is a proposed combination, not an implemented lock.

**Two strong challengers:** Arena + Kinetic Studio + Rally/Arc if audience research shows people primarily want contests; Chapter + Club Editions + Arc if users most value remembering weeks with a group. Signal + Quiet Current + Tempo is a deliberately smaller product bet, worth testing with already engaged tracker users.

For a directional usability study, use the same tasks and data across alternatives, rotate the presentation order, and recruit both competition-seeking tracker users and people who prefer social accountability. A small first round can reveal comprehension/friction; it cannot establish retention or health outcomes.

1. An invited newcomer identifies the group, sport, score rule, visibility, and close time, then joins and locates the tracker step.
2. An existing member finds their position and explains why an activity did or did not count.
3. A member below the podium interprets their week without assuming the app requires extra exercise.
4. A user with stale data finds the last import time and the appropriate reconnect/status action.
5. A user distinguishes weekly effort standings, an estimated training benchmark, and an official sourced race result.

Capture task completion, hesitation, wrong expectations, and spontaneous interpretation before asking aesthetic preference. The strongest concept is the one people understand and want to return to, not only the one they rate prettiest.

## Prototype inventory and limits

The interactive UX study contains **four directions × twelve surfaces = 48 screen compositions**, using sample data and local presentation-only actions. The style study contains **five treatments of the same weekly board**, paired with the five working brand names. The screen selector allows direct page-to-page comparison; the direction picker compares complete alternatives. Buttons demonstrate navigation, details, join previews, and demo connection states.

Mock actions do not create real groups, invite anyone, authorize trackers, publish results, or modify application state. Future ideas—group identity presets, weekly archives, badges, additional sources, and alternative clocks—are labeled as concepts in this document. This study does not edit app code, scoring, data models, routes, or existing theme tokens; concurrent implementation changes belong to their own work. This document is an additive design study rather than a replacement for the missing living design guide.

Browser verification covered all 53 compositions at 736 px and 320 px host widths in light and dark appearances: **212 layout checks**, with no JavaScript errors or detected horizontal content overflow after corrections. Join preview, source-state changes, activity/Pace switching, editable crew-name preview, creation review, and style detail dismissal were exercised. Selected screens were visually inspected. The sample current-week snapshot represents Thursday, October 15, rather than claiming to show today's real activity. Production typechecks/builds were not needed for this presentation-only study.
