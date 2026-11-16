# Carter Island: Step 17 playtest, November 16, 2026

## Adam: the five things that matter most

1. **Keep the new shove controls and ledge fall.** Space no longer turns a missed quiet grab into an attack,
   and I successfully shoved Tower 1 off his platform in the live browser build.
2. **Shove, move closer, grab, knock out is now the easiest tested way home.** It won all 90 runs across
   three response speeds, with no solitary trips; quiet sneaking still works but takes much longer.
3. **The grab hint can tell you to press a button that currently does nothing.** After a shove, the guard
   can be 1.7 m away while the hint offers Space; you must close to 1.1 m first.
4. **Taking the card before knocking out the office guard avoids the silent alarm.** Reversing those two
   actions changes the alarm even though the same guard ends up unconscious.
5. **Keep the seven-minute timer while fixing these choices.** Walking carelessly still gets punished,
   vents reward preparation, and pull-ins remain useful; shortening every run would hurt learning.

## Build, scope, and method

- Reviewed source: `de6dda2e96e361944d2df3b23477c058a59af230`, main after Step 17 and the vision update.
- Branch: `codex-review-1`. Read README, CONTRIBUTING, DESIGN, TASKS, and VISION before review work.
- Live build: `7e5dd71b7626`, matching the local site content hash.
- Baseline **`npm test`: 480 passed, zero failed/skipped**, 194.48 s. Run before review scripts were added.
  [Output](../../tools/review/nov16-tests.txt). Final repo-rule checks: 5/5 pass; review JS syntax checks pass.
  No production code, existing tests, DESIGN, or TASKS changed.
- 252 attempted complete routes: 210 reactive attempts, 42 planned attempts. Two planned attempts stopped
  after a real solitary capture when the controller could not finish its next instruction; see below.
- Reactive departures vary from 0 through 14.5 s in 0.5 s steps. Planned departures: 0, 2, 6, 10, 14, 18 s.
  Waiting happens in the original bed and uses the actual timer. Every full route starts without tools/card.
- Existing planning routines know the whole map and forecast patrols. Reactive policies also know positions,
  reach checks, and destinations. These are repeatable strategy comparisons, **not human success rates**.
  Deterministic departures can converge on the same patrol window; they are not independent random trials.
- Production logic runs at 120 ticks/s. Added telemetry observes grabs, captures, score counters, and room time.
  Event traces retain selected events, at most 150 per run; they are not exhaustive security logs.
- Live browser rounds send keyboard events and read the HUD/debug panel. No inventory/state was injected.
  The ledge check uses an explicitly disclosed debug spawn atop Tower 1, not a complete Yard route.
- I inspected visible states/screenshots. I did not evaluate audio, controller feel, human tension ratings,
  or actual Intel HD 6000 hardware. Future grapple/save systems are architectural considerations, not defects.

Reproduce with a recent Node supporting `node:module` `registerHooks` (this review used Node 24):

```sh
npm test
node tools/review/nov16-runs.mjs reactive
node tools/review/nov16-runs.mjs latency
node tools/review/nov16-runs.mjs planned
node tools/review/nov16-mechanics.mjs
node tools/review/nov16-audit.mjs
```

Cohorts write `nov16-<mode>-working.json`. Archived files below preserve this review's measured results.
Browser controllers are [here](../../tools/review/nov16-browser.js) and
[here for ledges](../../tools/review/nov16-ledge-browser.js); use as a navigation init script.
The archived unadapted force round used the original cue-following version described below.
In JSON, long display strings (HUD and caught descriptions) are arrays of text chunks; counters are unchanged.

## Results by strategy

All averages include every attempt, including the two unfinished intel attempts.
Time left is game seconds, not wall time; departure waiting and solitary costs are included.

| Strategy | Wins / attempts | Mean left, s | Mean spots | Solitary trips | Capture rooms |
| --- | --- | --- | --- | --- | --- |
| Rush 60 Hz | 27/30 (90%) | 383.20 | 2.57 | 3 | stairwell: 6 |
| Rush 5 Hz | 27/30 (90%) | 383.17 | 2.57 | 3 | stairwell: 6 |
| Rush 3 Hz | 27/30 (90%) | 382.52 | 2.57 | 3 | stairwell: 6 |
| Careless | 0/30 (0%) | 324.89 | 3.70 | 30 | mess-hall: 60 |
| Force | 30/30 (100%) | 393.21 | 3.03 | 0 | None |
| Force +250 ms | 30/30 (100%) | 390.55 | 3.03 | 0 | None |
| Force +500 ms | 30/30 (100%) | 387.41 | 2.83 | 0 | None |
| Ghost drop | 6/6 (100%) | 310.85 | 0.00 | 0 | None |
| Ghost return | 6/6 (100%) | 276.81 | 0.00 | 0 | None |
| Vent-first | 6/6 (100%) | 335.65 | 0.00 | 0 | None |
| Roof hoop | 6/6 (100%) | 276.86 | 0.00 | 0 | None |
| Roof quiet tower | 6/6 (100%) | 279.04 | 0.00 | 0 | None |
| Pull-heavy | 6/6 (100%) | 315.88 | 0.00 | 0 | None |
| Intel + pulls | 4/6* | 302.12 | 0.33 | 2 | cell-block: 2 |

*Intel: four wins, two unfinished attempts after solitary; neither is a final game loss.

Captures count solitary admissions plus final Caught outcomes; escaped grabs are excluded.

| Strategy | Mean spotted by source | Mean KOs R/A/P/L | Mean shoves |
| --- | --- | --- | --- |
| Rush 60 Hz | G 2.57 | 0.00/0.00/0.00/0.00 | 0.00 |
| Rush 5 Hz | G 2.57 | 0.00/0.00/0.00/0.00 | 0.00 |
| Rush 3 Hz | G 2.57 | 0.00/0.00/0.00/0.00 | 0.00 |
| Careless | G 3.50, S 0.20 | 0.00/0.00/0.00/0.00 | 0.00 |
| Force | G 0.93, H 2.10 | 3.80/0.00/0.00/0.00 | 2.37 |
| Force +250 ms | G 1.97, H 1.07 | 3.93/0.00/0.00/0.00 | 2.43 |
| Force +500 ms | G 2.70, H 0.13 | 4.27/0.00/0.00/0.00 | 2.50 |
| Ghost drop | All zero | 0.00/0.00/0.00/0.00 | 0.00 |
| Ghost return | All zero | 0.00/0.00/0.00/0.00 | 0.00 |
| Vent-first | All zero | 0.00/0.00/0.00/0.00 | 0.00 |
| Roof hoop | All zero | 0.00/0.00/0.00/0.00 | 0.00 |
| Roof quiet tower | All zero | 1.00/0.00/0.00/0.00 | 0.00 |
| Pull-heavy | All zero | 1.00/0.00/4.00/0.00 | 0.00 |
| Intel + pulls | G 0.33 | 2.00/0.00/3.00/0.00 | 0.00 |

Source codes: G guards, C cameras, L searchlights, S snitches, H your shoves, B guard broke free,
W sleeper woke, E empty bed, O other. Every omitted source is zero for that strategy.
KO types: R rear/held knockout (score `choke`), A above, P pull into hiding, L ledge.
A shove is an action; only a new Alert attributable to it adds a shove spotting.

The force policy opportunistically grabs unaware guards, otherwise shoves, runs into grab reach,
then chooses knockout. It leaves bodies exposed, takes the card fast, and returns by the drop.
It does not fetch boots, use jumps, interrogate, or manage radio check-ins.
The three force variants pause 0, 250, or 500 ms before attack/knockout decisions; they still have
exact position knowledge and continuous movement. This is a sensitivity check, not a human model.
The slower force variants had one and three grabs respectively, escaped by mashing; none became captures.

Rush runs directly through the front route, takes the card fast, drops home, and mashes if grabbed.
The 60 Hz version is the existing rusher. The 5/3 Hz variants add 250 ms before starting to mash.
All three won 27/30: this result survives removing implausibly fast mashing.
Careless follows the same destinations at walk speed, without waiting or takedowns.

Planned routes use quiet movement, cover, and patrol timing. Roof hoop fetches boots and uses the hoop/dash;
roof tower fetches boots, quietly grabs Tower 1, then uses the roof window. Pull-heavy uses four pull-ins
and knocks out the office sleeper before the card. Intel replaces the first pull with a rear interrogation
and knockout, leaving that body out; it is not a controlled test of interrogation alone.

**Intel limitation:** two attempts reached solitary, not a final loss. The first guard was knocked out at
13.71 s, faked check-ins at 20.02 and 80.01 s, then grabbed the returning player at 94.23 s after waking.
The route controller stopped in solitary at 98.08 s. That is evidence of a bad return plan after leaving
an exposed body, not evidence that interrogation itself causes failure. The other four attempts won.
The score helper calls an unfinished run's rank "caught"; the table correctly treats these as unresolved.

Raw cohorts: [reactive](../../tools/review/nov16-reactive.json),
[response delays](../../tools/review/nov16-latency.json),
[planned](../../tools/review/nov16-planned.json).

### Live browser checks

| Round | Observation | Scope |
| --- | --- | --- |
| Force, approach before grabbing | Won, 6:40 left; 4 KOs, 2 shoves, 2 bodies found; no solitary/alarm | Complete run |
| Force, obey combined grab hint | Caught, 5:43 left; 2 shoves, 0 KOs; solitary used | Crude cue-following controller |
| Vent-first, run exposed sections | Caught, 5:00 left; card/tool acquired; 4 guard spots, no KOs | Complete run |
| Rush, corrected controller | Won, 6:36 left; 2 guard spots; no KOs or solitary | Complete run |
| Tower 1 ledge | Named shove-off hint, guard falls to x=33, KO and body found | Debug-spawn fixture |

The failed vent round is useful: obtaining the screwdriver does not make the exposed approach or return
safe. Its controller kept trying to sleep after being seen entering bed instead of escaping the hunt.
The planned vent cohort uses cover and wins cleanly. A tool route and a stealth route work together here.
An earlier rush observation needed manual Up after a controller bug; it is archived separately and excluded
from the comparison. Browser rounds are supplementary observations, not extra samples in the cohort table.

[Force screenshot](nov16-force-win.jpg), [ledge screenshot](nov16-ledge.jpg),
[force HUD log](../../tools/review/nov16-browser-force.json),
[unadapted force log](../../tools/review/nov16-browser-force-unadapted.json),
[vent log](../../tools/review/nov16-browser-vent.json),
[corrected rush log](../../tools/review/nov16-browser-rush-corrected.json),
[ledge log](../../tools/review/nov16-browser-ledge.json).

## Findings and recommendations

### F1. Fast force defeats its consequences before they matter — high

**Found:** instant force won 30/30 with 6:33.21 left on average, versus rushing's 27/30 and 6:23.20.
Adding 250/500 ms response delays still gave 30/30 each, 6:30.55/6:27.41 left, no solitary.
The advantage is substantial against both planned stealth and careless walking.

**Evidence:** cohort JSON above; production configuration at `site/js/game/config.js:222`, `:236`, `:332`.
At departure zero: shove/KO cell guard at 1.73/1.95 s; KO Mess Hall guard at 6.43 s; shove/KO checkpoint
at 10.33/10.55 s; office KO at 14.83 s; win at 19.53 s with two bodies already found.
The first scheduled radio check is 20 s, and KO recovery is 75 s. These clocks cannot meaningfully oppose
this particular learned route. This is not a claim that body discovery or radios never function.

**Fix:** preserve shove-to-grab, ledge falls, and pull-ins. First prototype a visible consequence for
force noticed by another awake guard: a local call/reinforcement or guarded exit that must be escaped.
Tie security knowledge to actual witnesses, discovery, and missed check-ins. Avoid an unexplained
prison-wide punishment for every quiet KO. Accept some speedrun reward, but require an exposed choice
or a clean escape rather than making repeated force the safest default.

### F2. Out-of-reach follow-up hint promises an unavailable action — medium

**Found:** shove at a 0.7 m gap pushes the guard to 1.7 m away. The prompt reads
"RUN / JUMP AWAY, or SPACE: grab", although grab reach remains 1.1 m.

**Evidence:** `site/js/game/prompts.js:107`–`:109`, `knockout.js:27`;
[mechanics results](../../tools/review/nov16-mechanics.json). Repeated Space without approaching does
nothing and the guard grabs at 1.967 s; moving closer then pressing Space holds him successfully.
The unadapted live controller lost; the adapted approach-and-grab controller won. That difference is
not a human usability study, but it independently confirms the missing instruction.

**Fix:** outside reach, say "Move closer to grab, or run away" while the stagger bar remains visible.
Show the actionable Space prompt only for the target it can actually grab. Keep the named guard.
Do not lengthen stun just to compensate for misleading guidance.

### F3. Stagger eligibility survives the end of the original shove — medium

**Found:** an expired shove leaves `staggerFull=1.5`. A later missed lunge sets ordinary stun to 0.9 s,
which is then incorrectly treated as a fresh shove stagger. Space can grab that Alert guard.

**Evidence:** `site/js/game/shove.js:52`–`:58`, `guard-ai.js:50`–`:52`, `grab.js:105`,
`knockout.js:29`. The lifecycle fixture uses the real missed-lunge function. Without a prior shove,
`isStaggering=false`, grab fails; with one, `isStaggering=true`, grab succeeds.
This contradicts TASKS Step 17's explicit "Only a shove's stagger can be grabbed" rule.

**Fix:** track the stun cause or a dedicated grab-window deadline; expire it when the shove ends.
Reset it on every replacement stun, release, wake, and knockout. Add a sequence regression test:
shove, recover, miss a lunge, try a frontal grab; compare with the no-prior-shove case.

### F4. Office alarm depends on action order — medium

**Found:** KO then card sets the alarm; card then KO does not. Every instant-force cohort run finished
without a silent alarm. The live force win also took the card before the office KO.

**Evidence:** `site/js/game/keycard.js:37`–`:46` only checks the sleeper when taking the card;
`knockout.js:69` has no later alarm re-evaluation. Explicit order fixture: true versus false.
The office sleeper is also deliberately absent from radio check-ins (`radio.js:19`).

**Fix:** decide what the alarm represents. If it monitors the office/card, monitor both event orders with
an understandable tell. If a missing guard is discovered later, remove the magical immediate early-KO
alarm and use a visible inspection/check-in instead. Either option should teach a causal rule.
Do not increase guard detection speed to hide an order-dependent rule.

### F5. Quiet choices work; their rewards have different jobs — medium

**Found:** ghost, vent, both roof variants, and pull-heavy all remain winnable without sightings.
The vent route is faster than the quiet front route; the roof route is slower but demonstrates boots,
vertical movement, and a window entrance. Pull-ins trade waiting for cleared space and hidden bodies.

**Evidence:** planned cohort and `tests/bot/yard-routes.mjs`; `config.js:326` gives a 60 s patrol reveal,
`radio.js:97` fakes check-ins for an interrogated unconscious guard. The intel run actually faked calls;
its returning player was caught by a recovered guard, rather than by a radio failure.

**Fix:** keep these identities. In the next Yard pass, let the roof bypass a meaningful threat and let
interrogation provide information/code the player can use immediately. Compare people choices in a
paired route with identical body handling, rather than interpreting this mixed route as an intel nerf
request. Explain that a faked radio check-in does not prevent waking up.

### F6. Rushing remains viable; ordinary walking remains dangerous — medium

**Found:** all three rush controls won 90%; careless walking won 0%. The main game differentiates pace,
but running toward the known objective is still unusually forgiving of repeated sightings.

**Evidence:** all rush variants: 30 grabs, 3 solitary trips, 3 final losses across 30 runs each.
Six capture events per variant were in Stairwell. Careless: 60 captures in Mess Hall, 30 solitary and
30 final losses. `config.js:53`/`:93`: player 6.5 m/s versus chase 5.2 m/s. Heat uses 6 s locks
(`config.js:281`), only on the specified events/doors (`heat.js:18`, `:32`).

**Fix:** retain outrunning a guard in open space; making pursuit faster than running would undermine
readable escape. Trial the already-discussed 9 s lock with real tells and escape options, measuring
this same cohort. Add route knowledge and decisions to chases instead of stamina or surprise tackles.
A 9 s trial is a proposal here, not a new measured result.

### F7. Heights provide legitimate refuges, but one interaction ignores height — medium

**Found:** explicit 2.8 m pipe fixtures in Cell Block, Laundry, and Mess Hall remained ungrabbed for
90 s after an alarm. Ground guards cannot climb those ladders; grab height is limited to 1.2 m.
This is a useful learned escape perch, not automatically a broken progression gate.
Separately, the office card can be reached with the player's feet 5 m above it.

**Evidence:** [audit results](../../tools/review/nov16-audit.json), `config.js:152`, `grab.js:10`,
`keycard.js:9`–`:11` checks only horizontal distance. No full-run grapple/roof sequence break was
established by that fixture; it demonstrates a permissive interaction that future vertical rooms expose.

**Fix:** keep deliberate high refuges and show guards searching below. Require vertical reach for the
card and other fixed interactables, consistent with ordinary pickups. Add a full-route regression when
the next vertical shortcut is built. Vents/drop/window bypassing lockdown is intentional and fun;
turning all these exits into locked doors would remove the equipment payoff.

### F8. Drawings and stealth checks are substantially better aligned — low, with one remaining origin bug

**Found:** 400 sampled ground-level guard/stance combinations had zero drawn-versus-checked mismatches
when including both beam and close-awareness box; cameras also had zero out of 400.
This is a bounded geometric check, not a proof across every obstacle, elevation, or animation.

**Evidence:** `vision.js:87`, `render/guard-view.js:117`/`:131` share cone/close-zone data.
`camera.js:76`/`:91` and `render/yard-views.js:124` share the beam model for searchlights;
`visibility.js:13`/`:30` asks the same observer checks for the player's look.
`render/game-view.js:49` draws footstep rings at player height, and `noise.js:29` includes height in hearing.
However, `shove.js:159` omits the player's y from shove noise; the ping/hearing origin defaults to ground.
The body impact correctly supplies its landing y (`shove.js:113`).

**Fix:** include actual y on the initial shove noise and test listeners above/below the event.
Keep the shared shape functions. Add an elevated shove noise/ring fixture rather than another flat-only
cone test. Also remove stale "Space shoves" comments in `knockout.js:4` to prevent future regressions.

### F9. Warning time is learnable, but the nominal detection values are not the whole clock — low

**Found:** the stationary baseline below has an actual question mark, Alert pause, then 0.35 s lunge tell.
At 1 m, searching guards reach Alert in 0.53 s versus a calm guard's 1.25 s. State changes matter.
Shoving intentionally skips the 0.6 s surprise pause; standing still after it still gets grabbed near 2 s.

**Evidence:** `config.js:97`–`:119`, `guard-ai.js:35`–`:60`; actual production ticks in the audit JSON.
Times are from fixture start with unobstructed sight to a stationary target; guards move during the test.
Standing still halves awareness gain; crouching while still halves it again. These are not running times.

| Initial distance | First ? | First ! | Lunge begins | Grab | ! to grab |
| --- | --- | --- | --- | --- | --- |
| 1 m | 0.53 s | 1.25 s | 1.85 s | 2.20 s | 0.95 s |
| 3 m | 0.69 s | 1.47 s | 2.09 s | 2.44 s | 0.98 s |
| 6.5 m | 1.24 s | 2.58 s | 3.64 s | 3.99 s | 1.41 s |

Crouched/still at 1/3/6.5 m: Alert 2.49/2.87/4.67 s; grab 3.44/3.83/5.72 s.
Starting searching at 1/3/6.5 m: Alert 0.53/0.70/1.26 s; grab 1.48/2.00/3.23 s.
There is no new ? transition in the already-searching fixture; the guard starts in an escalated state.

**Fix:** retain these baseline values while correcting prompt F2. Teach that an already searching guard
reacts faster, and retain the visible meter/lunge tell. Re-test moving targets and audio timing with Adam;
headless clocks alone cannot establish whether the warning is easy to perceive.

### F10. More rooms and persistent progress need explicit transient state — medium architecture risk

**Found:** separate logic, rendering, room data, and config are strong foundations. The world coordinator
already orders pursuit, radios, knockouts, falls, timers, and input histories. The stale stagger bug is an
example of temporal state crossing systems. Future grapple/save features will multiply those transitions.

**Evidence:** `world.js:245`–`:269` updates local/away guards and room changes; `radio.js:114` changes
membership; `shove.js:95` accepts a knockout callback to avoid a cycle. No save implementation is claimed.

**Fix:** before saving, define durable progression separately from per-run state, with versioned plain data.
Centralize entering/exiting guard incapacitation so stagger/fall/hold/lunge flags have one cleanup rule.
Let grapple use the shared collision/vertical reach model instead of adding another special height test.
Do this as focused feature work, not a broad rewrite before the next playtest.

### F11. Rendering has sensible safeguards; old integrated-GPU performance is still unverified — low

**Found:** no shadows/post-processing and adaptive pixel resolution help. Transparent cones/pools,
spotlights, repeated beam queries, and room-view reconstruction are the risks as rooms grow.

**Evidence:** `render/stage.js:19`–`:32`, `render/game-view.js:140`–`:149`, `visibility.js:13`,
`render/yard-views.js:124`, `render/debug-view.js:59`. Similar beam geometry is requested for detection,
player appearance, normal rendering, and debug rendering. Live debug FPS varied with other work running;
that is not a controlled benchmark and does not validate a 2015 MacBook Air.

**Fix:** profile the Yard at normal and `?low` on Intel HD 6000, with debug off and the same patrol phase.
Record frame-time percentiles and resolution changes. Cache shared beam results per simulation/render
state only if profiling shows they matter; avoid speculative optimization that desynchronizes visuals.

### F12. Frontal follow-up knockouts are reported as "from behind" — low

**Found:** the live force win lists four takedowns "from behind", including shove follow-ups approached
from the front. The new shove and spotted-source rows are useful, but that older label no longer fits.

**Evidence:** `site/js/game/takedown.js:166` assigns every held knockout to `choke`, regardless of grab
entry; `playtest.js:31` labels it "from behind". The live score puts all four under that category.

**Fix:** rename this bucket "after a grab", or retain grab-entry type if rear approach and stagger grabs
should be separate analytics. Do not infer four successful stealth approaches from that score row.

## Suggested balance trials, without applying them

| Value | Current | Recommendation | Why |
| --- | --- | --- | --- |
| Shove stun / push | 1.5 s / 1 m | Keep | Follow-up works once the hint teaches approach |
| Shove cooldown | 8 s | Keep initially | Force uses few shoves; changing it alone misses free rear KOs |
| Ledge KO threshold | 2 m | Keep | Tower fall now solves the cramped-platform escape problem |
| Run / chase | 6.5 / 5.2 m/s | Keep | Open-floor escape should remain possible |
| Lockdown | 6 s | Trial 9 s | Compare rush success and door waiting against this baseline |
| Near / far detect | 0.8 / 2 s | Keep | Actual clocks already vary sharply with stance and alert state |
| First radio / interval | 20 / 60 s | Trial witnessed-force call | Fast force can finish before first call |
| KO wake | 75 s | Keep for next pass | It already affects slower returns; global shortening hurts stealth |
| Headcount / solitary loss | 420 / 60 s | Keep | Expert spare time is not beginner spare time |

If stronger force consequences still leave shove-to-grab dominant, test a **0.4 s knockout commitment**
with a visible interruption rule as a separate experiment. Do not apply all trials together: that would
make it impossible to know which change improves decisions. No stamina meter or adaptive AI is justified
by this review. Keep the move satisfying and make its consequences matter within the actual route.

## Suggested task cards for Claude Code

These are proposals for Adam to copy; TASKS was not edited.

1. **Fix stagger follow-up prompt reach (F2).** Outside 1.1 m, show approach/escape guidance. Inside reach,
   name the exact Space target. Acceptance: shove from a 0.7 m starting gap; Space is never advertised
   as immediately usable while it cannot grab, including two nearby guards and height differences.
2. **Expire shove-specific grab eligibility (F3).** Separate shove stagger from generic stun. Acceptance:
   shove/recover/missed-lunge and shove/recover/cup-hit match the no-prior-shove behavior; current shove
   follow-up and short-fall intended behavior still work. Cover wake, release, and re-shove cleanup.
3. **Choose a causal office alarm rule (F4).** Document the security fiction, then make card/KO order
   follow that rule. Acceptance: both action orders have an explained outcome, cue, and regression test;
   do not silently introduce instantaneous global knowledge for every quiet takedown.
4. **Prototype one witnessed-force consequence (F1/F6).** Keep current shove controls and ledges. Give
   an awake witness a visible call with a usable response/escape choice. Replay these cohorts plus
   Adam's pull-in run; report success, route time, captures, and whether waiting in hiding remains tense.
5. **Audit vertical interaction/noise origins (F7/F8).** Require card/panel vertical reach and attach shove
   noise to actual feet height. Acceptance: correct elevated prompts, rings, listeners, and ordinary
   ground behavior. Keep intentional vent/window/drop escapes and high refuges.
6. **Make one Yard area demonstrate the vision (F5).** Provide a useful timed stealth crossing, boots
   bypass, and information/force alternative with visible tradeoffs. Acceptance: Adam can explain why
   he picked a route and name another reasonable one. Do not just add more guards or more equipment.
7. **Profile Yard on the target laptop (F11).** Debug off, fixed viewport/patrol sequence, normal and low
   resolution. Record frame times and quality transitions before selecting optimizations.

8. **Update the held-knockout score label (F12).** Use "after a grab", or record rear versus stagger
   entry explicitly. Acceptance: a frontal shove-grab is not described as a rear stealth approach.

Test gaps are particularly the **sequences** in cards 1–3, not lack of basic shove tests: the existing
480 tests already cover many individual features, but did not catch these interactions.
