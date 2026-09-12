# The Website Is Lying

A psychological browser mystery built with React/Vite. Seven rules, two unreliable voices, twenty routes, five connected puzzles and six endings. The existing monochrome CRT interface and EN/RU/HE localization remain intact.

## Run

```sh
npm install
npm run dev
npm run build
npm run preview
```

Production hosting needs an SPA fallback to `index.html` for all routes. No server or external API is required. Fonts are bundled locally.

## Playing

Use the directory and its service index. Additional addresses can be entered in the internal address field on Help and 404. Terminal commands are Latin; clues, output and conversations use the selected language. Arrow Up/Down recalls commands. Escape leaves page-7 for Files.

EN / RU / HE changes presentation without changing progress, responses or timers. Hebrew uses document RTL and isolates paths, commands and mixed text. SIGNAL FX disables ambient texture only; horror events remain active. HUM is optional, extremely quiet and off by default. Escape dismisses a transient blackout; it also leaves page-7 at any time.

Refresh preserves the active run. START AGAIN resets the run with a new seed while retaining discovered endings and secrets. Time spent away does not advance narrative timers. The optional name field accepts an alias or refusal; the alias itself is not saved. All reactions concern actions inside this game. No permissions, sensors, external browsing history or personal information are requested.

The first-play target is 25–40 minutes: orientation, noticing a changed rule, cross-referencing archives and logs, reconstructing a route and chronology, then interpreting conflicting evidence. This is a design target, not a measured human playtest duration. No minimum-duration gate forces players to wait; knowing solutions makes replay much faster. Help offers three increasingly explicit optional hints.

## Systems

- `src/game/engine.js`: pure reducer and fixed-point event evaluation, preserved original/current rules, logs, replies and puzzles.
- `src/game/events.js`: once-per-run event IDs, clock/action delays, rare seeded events and changing routes.
- `src/game/story.js`: route/file/archive gates, trust requirements, ending eligibility and adaptive hints.
- `src/game/terminal.js`: whitelisted simulation; input is never evaluated or sent to a shell.
- `src/game/persistence.js`: versioned run and separate meta saves. Duplicate completion IDs prevent repeated meta awards.
- `src/game/GameContext.jsx`: logical clock, persistence and browser navigation.
- `src/pages/CorePages.jsx` and `Investigation.jsx`: shared page components using translation keys.
- `src/translations/en.js`, `ru.js`, `he.js`: existing locale dictionaries; `story.js` contains matching EN/RU/HE expansion entries. `index.js` performs complete-sentence interpolation, bidi isolation and Unicode grapheme segmentation.
- `src/components/LanguageSwitcher.jsx`: reusable presentation-only selector.

Run storage: `lying:run:v2`. Meta storage: `lying:meta:v1`. Language/effects use separate preference keys. Storage failures fall back to an in-memory game. The synthetic session seed determines rare events; 5%, 2% and 1% events are never required for an ending.

Development-only `?debug` exposes an inspector for stage, trust, rules, puzzles, routes, fired events and eligible endings. It is opt-in and removed from the production bundle. Test state probes exist only in the test fixture.

## HorrorDirector

`src/game/HorrorDirector.js` owns seeded anomaly selection and presentation timelines. It reads session duration, progression, visits, prior page, replies, visibility and previous endings. Optional anomalies begin after five minutes; deeper identity events begin after twenty. A seeded five-minute quiet window interrupts escalation. Minor/medium events reserve 90–130 seconds; major events reserve four minutes. Caps per run are ten minor, five medium, two major and one level-four anomaly. Story-memory remarks share cooldowns with the director. Scripted Rule 02/page-7/Rule 08 sequences reserve quiet space and preempt cosmetic anomalies.

Projections can alter a displayed rule, registry count, sender label or terminal response without rewriting its underlying evidence. Original rules and puzzle-critical Rule 05 remain intact. The impossible pre-session log used by the archive puzzle appears after the player has had time to inspect an accurate log, and remains discoverable on return. Terminal identity flashes and wrong-page glimpses never become commands or visited routes. A false ending awards nothing and resumes Home once. Existing saves are migrated in place; anomaly IDs, deadlines, cooldowns and meta ending differences survive refresh.

Audio remains optional. Its low-level sine room tone fades into silence during selected director scenes; tiny bounded pulses occur only on selected events. No media capture, clipboard access, external requests, real cursor control or browser permissions are used. Only Page Visibility state drives tab-title events. Blank overlays recover automatically and can be dismissed with Escape or their keyboard-accessible recovery control.

## Verification

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Tests cover all six endings, all 27 reply combinations, gates, corrupt saves, delayed events, meta memory, real UI puzzle completion, language/state invariance and all twenty routes at phone/tablet/desktop widths in three languages. Browser screenshots are written to `test-results/`.

<details>
<summary>Developer walkthrough and branch requirements — spoilers</summary>

1. Read Rules, open archive v3.2, visit About or Status, then return to Rules. Status accepts changed rule **5**, previous count **6**, current count **7**. This opens the investigation services.
2. Archive's red signal slowly deepens over thirty-two seconds. Waiting and clicking are recorded differently; delayed remarks are optional and never gate investigation. Reply to ADMIN or read `notice.txt` to discover page-7. Its first line arrives after three seconds, the second after eleven; after twenty-four seconds it returns to Files. Repeated visits use different finite sequences.
3. Archive restoration code **6082** combines original directory size 6, the impossible log entry eight seconds before initialization (08), and Status's checksum digit 2. Logs and Status must have been inspected and the second voice discovered.
4. Read v1.4. Enter three distinct invalid internal paths; 404 retains `/ol`, `d-r`, `ules`. Enter `/old-rules`. Rule 08 is masked after two seconds. Archive v1.0 provides the conflicting “THEM” wording.
5. The verb in v2.1 and object in `recovery.dat` give **trace origin**. Reconstruct **lock → alias → visitor** from v1.4 and `session.log`; enter **reconcile lock alias visitor**. This opens Admin and the third conversation question.
6. `readme.old` exposes Mirror. Compare Mirror, Old Rules and archive v1.0. Retain “sources disagree about who remains” and “every version restricts departure”; the administrator's identity is not established.
7. A protocol requires the reconstructed chronology, Rule 08 and all three conversation replies. Preparation commands do not finish the game. Ratifying a protocol closes conflicting routes; countersign its registry in Users to expose Real Exit. Final disconnect resolves the accumulated branch.

| Ending | Accumulated route |
| --- | --- |
| OBEYED | At least two refusals/silences, website trust ≥3, at most two broken behavioral rules, observed red event, `seal admin`, ratify Status containment, registry, Real Exit. |
| FREED | Trust + carry yes, identity no/silent; admin trust ≥2, inspect Users and `admin.lock`, `release admin`, ratify Admin release, registry, Real Exit. |
| REPLACED | All three yes (admin trust ≥4 and identity consent), release preparation/evidence as above, registry, Real Exit. |
| TRAPPED | Read all three contradictory sources and solve their comparison, `seal admin`, ratify manual containment on Admin, registry, Real Exit. This remains available for every reply combination before commitment. |
| ESCAPED | At least two refusals/silences, all contradictory evidence, `disconnect claims`, ratify Mirror detachment, registry, Real Exit. |
| NULL | Before ratifying any protocol: inspect blank margins on Deleted and Mirror, run `history --erased` after reading `readme.old`; assemble `/null`, enter it and select ∅. Main investigation prerequisites still apply. Returns to intro after five seconds; meta remembers. |

Behavioral violations are rules 01, 02, 04 and 06. False assertions in rules 03, 05 and 07 are evidence, not actions the player can violate. Neither source's account is authenticated by any ending.

</details>

