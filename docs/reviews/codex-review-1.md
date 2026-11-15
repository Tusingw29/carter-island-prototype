# Carter Island: outside playtest review 1

Reviewed November 15, 2026. No game, test, design, or task-board files changed.

## Adam: the five things that matter most

1. **Running past everyone is currently the easiest way home.** The rushing bot won 30 of 30 runs,
   and a live browser run also won with 6:25 left, three sightings, and no knockouts or captures.
2. **Some light drawings still give the wrong answer.** A crouched player can be detected outside a
   guard's beam, and the security camera checks a different area from the beam it draws.
3. **Repeated slides beat running while making much less noise.** I measured 6.91 metres per second
   with a 1-metre noise radius; running is 6.5 with an 8-metre radius.
4. **Hiding when the first question mark appears can turn the meter straight to full.** In one close
   encounter, entering a locker at one-third awareness led to a grab only 0.63 seconds later.
5. **Keep the hiding tension, pull-ins, smart camera, and seven-minute timer.** All three careful
   routes remain beatable, and the evidence points to fixing escapes and misleading cues first.

## Scope, baseline, and how to reproduce

- Source commit: `01490af260e13f2e5c027d05d6b69cfc2162e622` on `main` when this review began.
- Review branch: `codex-review-1`.
- Read first: README, CONTRIBUTING, DESIGN, and TASKS, including the Step 14 qualifications.
- **First check: `npm test` passed 433/433, zero failures/skips, in 81.90 seconds.**
- Live build: `f37699a788d0`. Recomputing the release script's source-content hash locally produced
  the same hash. This is a content hash, not a Git commit id.
- Node v24.14.0; simulations use the production `stepWorld` at 120 Hz and unchanged production config.
- Live browser check used keyboard events and visible HUD/debug text, without changing game state.
  It crossed Cell Block, Mess Hall, Stairwell, Office, drop, and Cell Block. It won as Inmate with
  three guard sightings, zero other sightings, zero takedowns, no alarm, and no solitary.
  [Browser score screenshot](codex-review-1-rusher.jpg).

Run from the repository root:

```sh
npm test
node tools/review/playtests.mjs
node tools/review/adaptive.mjs
node tools/review/pull-route.mjs
node tools/review/probes.mjs
node tools/review/recovery.mjs
```

`playtests.mjs` records the existing planning bots through a review-only import hook if `tapes.json`
is absent. Its checked-in tapes are specific to the reviewed commit. After game changes, remove that
review artifact before regenerating it. No production import or test file is rewritten.

The primary comparison below contains **100 complete runs**. Ghost, vent, roof, and deliberate knockout
policies each use ten departures, 0 through 18 seconds in two-second steps. They replan each leg with
perfect information, using `tests/bot/`. Rusher and Careless each use 30 departures, 0 through 14.5
seconds in half-second steps. They know the objective graph, do not wait for patrols, and respectively
run or walk. They tap doors and the card and try to mash free if grabbed. Careless retries after
solitary; its unchanged bad decisions lead to the second capture.

Knockout-heavy deliberately pulls the Cell Block guard, both Mess Hall guards, and checkpoint guard
into hiding, then knocks out the sleeper and takes the card. It attacks every original guard on that
route; it does not hunt down optional Yard/Laundry guards or every arriving radio responder.
Vent-first actually collects the screwdriver and traverses Maintenance and the duct. Roof actually
collects the boots through the shed hatch, climbs the hoop route, dashes the gap, and enters the window.

These are controller success rates across deterministic departure phases, **not human win probabilities**.
They sample timing variation, not random layouts or independent players. Planning bots are much more
informed than a novice; the reactive controls respond at game-step speed. Neither models discovery,
reading the controls, hesitation, controller ergonomics, or Adam's actual recorded inputs.

## Primary player-type results

Time left is in seconds, including departure waits and any solitary penalty. Means use every run;
winning-run means exclude failures. A capture means being sent to solitary or the final capture,
not every initial grab that can be mashed out of. Captures are attributed to the room **before**
solitary moves the player. Takedown figures are means per run, not totals.

| Player type | Wins / runs | Win rate | Mean left | Winners left | Solitary trips |
| --- | --- | --- | --- | --- | --- |
| Ghost | 10 / 10 | 100% | 318.92 | 318.92 | 0 |
| Knockout-heavy | 10 / 10 | 100% | 316.21 | 316.21 | 0 |
| Rusher | 30 / 30 | 100% | 393.34 | 393.34 | 0 |
| Careless | 0 / 30 | 0% | 327.94 | n/a | 30 |
| Vent-first | 10 / 10 | 100% | 335.21 | 335.21 | 0 |
| Yard roof route | 10 / 10 | 100% | 280.66 | 280.66 | 0 |

Mean sightings per run:

| Player type | Guards | Cameras | Searchlights | Snitches | Other | Total |
| --- | --- | --- | --- | --- | --- | --- |
| Ghost | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Knockout-heavy | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Rusher | 3.00 | 0.00 | 0.00 | 0.00 | 0.00 | 3.00 |
| Careless | 4.00 | 0.00 | 0.00 | 0.20 | 0.00 | 4.20 |
| Vent-first | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Yard roof route | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

Mean takedowns and total capture locations:

| Player type | From behind | From above | Pulled in | Capture rooms (total) |
| --- | --- | --- | --- | --- |
| Ghost | 0.00 | 0.00 | 0.00 | None |
| Knockout-heavy | 1.00 | 0.00 | 4.00 | None |
| Rusher | 0.00 | 0.00 | 0.00 | None |
| Careless | 0.00 | 0.00 | 0.00 | Mess Hall: 60 (30 solitary, 30 final) |
| Vent-first | 0.00 | 0.00 | 0.00 | None |
| Yard roof route | 0.00 | 0.00 | 0.00 | None |

All deliberate knockout runs had five knockouts, no bodies found, and the office-knockout silent
alarm. All primary Ghost/vent/roof wins had zero sightings and zero knockouts. No primary policy
interrogated anyone or threw a guard. The above-drop count being zero describes these policies;
it does not establish that drops are useless for a person.

Raw evidence: [adaptive routes](../../tools/review/adaptive-results.json),
[pull-in route](../../tools/review/pull-results.json), and
[reactive runs and tape sensitivity](../../tools/review/results.json).

### Additional 120 sensitivity runs

The other 30 reactive runs added opportunistic grabs/shoves to rushing: 30 wins, mean 392.68 seconds
left, mean 2.10 rear knockouts, zero pulls/drops, and zero solitary. Every run knocked out the office
sleeper and triggered the silent alarm. This did not improve on simply running past him.

The remaining 90 runs replayed the original clean input tapes at shifted departure phases, without
replanning or repairing missed interactions. They deliberately test timing brittleness:

| Fixed tape | Wins / 30 | Mean left | Solitary | Mean guard sightings | Other sightings |
| --- | --- | --- | --- | --- | --- |
| Ghost attempt | 1 | 315.07 | 29 | 2.07 | Snitch: 0.03 |
| Vent-first | 2 | 292.23 | 28 | 1.77 | 0 |
| Yard roof | 2 | 312.91 | 28 | 2.07 | 0 |

Fixed-tape captures: Ghost, Cell Block 52 and Mess Hall 6; vent, Laundry 24 and Cell Block 29;
roof, Mess Hall 7 and Cell Block 49. They made no takedowns. These failed Ghost attempts are **not**
Ghost completions. All fixed-tape wins were clean. An interaction missed once can derail the rest
of a tape, so these low win rates cannot be used to call the routes unfair. The adaptive controls
above are the useful feasibility check. There are 220 complete cohort runs in total, plus fixtures.

## Exploits and dominant strategies

### R1. Door escapes make running dominant — high

**Found:** The player can ignore sneaking, use fast doors, grab the card, drop home, and outrun everyone.
At departure zero, the reactive rusher finished in 19.25 seconds; the clean front/drop control needed
95.36 seconds. Across all phases, rushing won 30/30 with exactly three guard sightings per run and
no captures. The browser run independently confirmed a complete win with three sightings.

**Evidence:** `site/js/game/config.js:93` sets chase speed to 5.2 against run speed 6.5 at line 53.
`site/js/game/portals.js:76` immediately converts pursuers to Searching when the player leaves;
line 102 only makes receiving guards Suspicious. `site/js/game/guard-ai.js:143` also ends off-room
chases. The rusher crosses the narrow camera window too quickly to fill its meter and leaves the
Office before the four-second sleeper wake-up. Raw runs are in `results.json`.

**Suggested fix:** Keep the responsive movement and the ability to escape a guard. Prototype limited
pursuit through one ordinary doorway, with an obvious warning and a safe arrival layout. Compare
that version against this rusher and the clean bots before adopting it. Preserve vents/drop as
strong escape rewards. Shortening the entire timer or making all guards faster would damage the
hiding loop without addressing why doors erase the danger.

### R2. Sliding is a quiet substitute for sprinting — medium

**Found:** Repeated slides travel 69.13 metres in ten seconds: 6.91 m/s including restart frames,
faster than the 6.5 m/s run. They use a 1 m hearing radius and half-rate visual awareness.

**Evidence:** `site/js/game/moves.js:203` allows another slide as soon as the previous one ends;
there is no slide recovery gate. `site/js/game/config.js:352` sets 7 m/s for 0.45 s;
line 77 sets noise radius 1. `site/js/game/stance.js:8` gives sliding the crouch multiplier.
The empty-lane reproduction is `probes.json`, `exploits.slideChain`.

**Suggested fix:** Preserve the seven-metre burst but trial a 0.35 s recovery between slides.
With crouch movement during recovery, sustained speed falls to about 4.92 m/s while each slide
still feels crisp. Check the existing low-ceiling extension and jump buffering before accepting it.
This measurement proves the movement tradeoff, not a complete slide-only escape route.

### R3. Pull-ins are powerful, but rushing is the larger problem — low

**Found:** The deliberate five-KO route won 10/10, averaging 103.79 seconds total, including departure
waits. Four pull-ins concealed the bodies immediately, and the sleeper was the fifth knockout.
This is strong and enjoyable-looking on paper, but substantially slower than rushing.

**Evidence:** `pull-results.json`; `site/js/game/takedown.js:221` combines knockout and storage.
`site/js/game/knockout.js:163` handles waking, and `site/js/game/radio.js:90` handles missed calls.
In the isolated pull fixture, the Cell Block guard was pulled at 10.77 s, missed his first call at
20.02 s, and drew a Mess Hall responder into the room at 26.78 s. He woke at 89.76 s: about 79 s
later, consistent with 75 s asleep plus four seconds banging. This is not permanent removal.
The observer was later detected once; that fixture is not presented as a clean full run.

**Suggested fix:** Keep pull-in reach and immediate storage. Fix R1 before considering a nerf.
Interrogation adds two seconds to suppress a real radio response; surface that upcoming cost more
clearly beside the choices. The office sleeper is off-radio (`radio.js:20`), so his radio-code reward
has no mechanical value; label that exception or give him a different useful reward. Knocking him
out remains an optional tradeoff that explicitly causes the silent alarm (`keycard.js:45`).

### R4. Safe ledges and intended sequence breaks should remain — low

**Found:** In three alarmed fixtures, standing on the new Cell Block, Laundry, and Mess Hall pipes
for 90 s produced zero seen ticks and zero grabs. Ground guards cannot climb after the player.
This is a reliable way to wait out a hunt, at the cost of timer time.

**Evidence:** `probes.json`, the three `pipe` entries. `site/js/game/rooms.js:16` puts the pipes at
2.8 m; `site/js/game/guard-ai.js:58` chases toward an x coordinate, without a climbing path;
`site/js/game/grab.js:10` limits vertical grab reach. These are documented safe perches in Step 14.
No tested thin-barrier fixture produced a through-wall grab.

**Suggested fix:** Keep these short refuges and the drop attack they teach. A future vertical guard
should have an announced climbing/search behavior rather than magically seeing through floors.
For a future grapple, decide which ceiling routes are genuinely safe before expanding the map.

Unlock audit: the tool-free front door and tool-free return drop are **fun, intended sequence
breaks**, explicitly allowed by DESIGN/TASKS. The hoop climb is also intended. Existing passing
`tests/yard.test.mjs` checks that a normal running jump cannot clear the roof-window gap, dash is
locked without boots, the shed door is exit-only, and the hatch/window require the correct height.
My adaptive roof run fetched the boots first. I found no complete unintended no-boots roof route
or no-screwdriver vent route; this is not an exhaustive search of every possible input sequence.

## Fairness and readability

### R5. Guard/camera drawings and detection disagree — high

**Found:** The claimed flashlight rule has an invisible close-range exception. With a guard at
x=10 facing right, a crouched player at x=10.1 is seen although none of the six sampled body points
is inside the drawn fan. Security cameras use a horizontal strip for detection but draw a sloping
fan. At the Stairwell camera's left sweep endpoint, a standing player at x=15.3 is detected outside
the drawn body intersection. A 100-position, 5 cm-spaced sweep found 13 disagreements.

**Evidence:** `site/js/game/vision.js:84` returns true from close-range proximity without checking
the cone. The renderer uses only `coneLit` (`render/guard-view.js:101`).
`site/js/game/camera.js:54` draws `cameraLit`; line 82 checks horizontal distance, not that fan.
`probes.json` stores both predicates and the exact example coordinates.

**Suggested fix:** Give guard close awareness an explicit drawn region, or use the rendered shape
for that check. Make security cameras use the same shared-shape approach already used successfully
by searchlights. Include vertical bodies and low crouches in the comparison, not only floor points.
Preserve cover clipping and the existing six-point body sampling unless tests justify changing them.

### R6. Hiding after '?' skips the remaining heat-up — medium

**Found:** The meter can jump from 0.333 to 1 in one 1/120 s step when the player hides. In the
close locker fixture, '?' appeared at 0.533 s, hiding triggered '!' at 0.542 s, and the grab landed
at 1.175 s. That is 0.63 s after '!'; the ordinary lunge warning is absent for a known hiding spot.

**Evidence:** `site/js/game/world.js:218` checks whether the previous step saw a new hiding entry;
line 223 treats the glimpse threshold as sufficient to raise a full alarm. `guard-ai.js:62` calls
`tryPullOut`, whose no-lunge behavior is explicit in `grab.js:49`. The reproduction is
`probes.json`, `exploits.watchedHide`.

**Suggested fix:** Keep the rule that a guard who watched you enter can pull you out. Make it
readable: say "He saw you hide" at the spot, and provide a visible reach-in tell. Trial 0.35 s for
that tell, so the player gets the same opportunity to leave as during a lunge. Consider remembering
the spot at '?' while allowing the existing meter to finish instead of instantly making it full.

### Measured warning times

These are fresh, empty-room fixtures, no lamps/noise/cover, guard initially at x=10, player at
x=10+distance. The player remains still. Once '?' occurs, the real AI approaches; distances below
are **initial** distances, not held fixed. All values are seconds from first exposure, rounded to
hundredths. Searching rows start in Searching and therefore do not have a new '?' transition.

| Distance | Player/guard condition | '?' | '!' | Lunge starts | Grab |
| --- | --- | --- | --- | --- | --- |
| 1 m | still | 0.53 | 1.25 | 1.85 | 2.20 |
| 1 m | crouched still | 1.06 | 2.49 | 3.09 | 3.44 |
| 1 m | wary still | 0.36 | 1.07 | 1.67 | 2.02 |
| 1 m | searching still | n/a | 0.53 | 1.13 | 1.48 |
| 3 m | still | 0.69 | 1.47 | 2.09 | 2.44 |
| 3 m | crouched still | 1.37 | 2.87 | 3.47 | 3.82 |
| 3 m | wary still | 0.46 | 1.23 | 1.86 | 2.21 |
| 3 m | searching still | n/a | 0.70 | 1.65 | 2.00 |
| 6.5 m | still | 1.24 | 2.58 | 3.64 | 3.99 |
| 6.5 m | crouched still | 2.48 | 4.67 | 5.37 | 5.72 |
| 6.5 m | wary still | 0.83 | 2.17 | 3.23 | 3.58 |
| 6.5 m | searching still | n/a | 1.26 | 2.88 | 3.23 |

The ordinary close stationary case gives 1.25 s to '!' and 0.95 s more to grab. That supports the
claim that normal sight capture is no longer instant. Configured 0.8/2.0 s times are not literal
encounter times: standing still halves fill, '?' applies a 1.5x boost, and the guard moves closer.
Searching's 3x boost is notably less forgiving: 0.53 s to '!' at 1 m, even while standing still.

Not every reaction has a sight meter. A loud door/throw can immediately cause Suspicious; a body
can immediately cause Alert; sleeper disturbance has a four-second countdown. Those are coherent
separate rules, but "guards always warn" is too broad. Ordinary Alert has the 0.6 s pause and a
0.35 s lunge tell; known hiding spots are the important exception above.

### R7. Full off-screen guard warnings disappear — medium

**Found:** The filling edge arrow can disappear exactly when its guard reaches full awareness.
The full guard meter is hidden before screen-edge positioning; its replacement '!' is pinned to
the guard, potentially outside the viewport.

**Evidence:** `site/js/render/overlay.js:98` hides full guard eyes before the projection at line 102;
the guard icon is pinned at line 211. This is a code-path finding, not a screenshot-verified case.

**Suggested fix:** Keep a full red edge arrow for off-screen guards during the reaction pause and
chase. Suppress the eye in favor of '!' only when the guard is actually visible. Test all four edges.

### R8. Noise rings understate reach; player color is otherwise well connected — medium

**Found:** Footstep reach comes from the correct noise radius, but its ring is shifted 0.2 m upward.
One-off rings start at 60% of the actual hearing radius and only reach full size as they disappear.
A fresh 12.5 m door noise initially draws 7.5 m although guards in the full radius react immediately.

**Evidence:** `site/js/render/game-view.js:45` shifts the steady ring; line 55 scales pulses from
0.6 to 1.0. `site/js/game/noise.js:18` checks the full Euclidean radius at the actual noise origin.

**Suggested fix:** Draw a faint full-radius boundary immediately at the actual origin, with an
inner expanding pulse for animation. It should remain possible to judge reach at a glance.

The player's silhouette/glow uses the same watcher functions as the senses (`visibility.js:13`
and line 34; `render/player-view.js:49`). This is good architecture and should be kept. It matches
the logic even where the beam itself is misleading. A lamp can make the player bright with no
watcher present; bright means vulnerable, not already spotted. Guard stun is another presentation
qualification: `senses.js:26` disables sight but `render/guard-view.js:68` keeps his cone visible.
Dim that cone while stunned. The decorative wall spotlight at `guard-view.js:55` is wider/longer
than the gameplay fan and does not cast obstacle shadows; keep it clearly subordinate to the fan.

Searchlight detection and drawing both use `camera.js:63`, `searchlightShape`, and the existing
20,000-plus-position shape comparison in `tests/playtest-5.test.mjs:49` passed. I found no analogous
searchlight shape defect. Its amber warning is a prediction, not current detection; its rectangular
ground patch (`render/yard-views.js:151`) is not cover-clipped and does not predict every raised
surface. Retain a distinct warning color and eventually derive those warning pools from the future
shape as well. Snitches have visible meters but still do not point/squint; Step 14 records this.

### R9. Failure is survivable early; late recovery needs time — medium

**Found:** Careless walking failed 30/30, with both captures in the Mess Hall and about 5:28 left at
final loss. Those runs ran out of chances, not time. Solitary is therefore a useful second chance,
but repeating the same behavior does not become safe just because the clock has slack.

**Evidence:** `results.json`; `site/js/game/solitary.js:31` takes 60 s and returns the keycard;
line 39 keeps tools; line 45 resets the mash chance. In `world.js:274`, being grabbed advances the
timer while freezing guard/radio/KO updates. The unskipped solitary trip also costs roughly nine
seconds beyond the penalty. `tests/readable.test.mjs:343` demonstrates a recovery win by granting
`hasKeycard`, not by earning it again through a complete route.

**Suggested fix:** Keep tool retention, the skip, and one solitary trip. Add an earned-keycard
recovery scenario at several remaining times and display the total time consequence clearly.
Do not make the penalty harsher because a perfect-information bot finishes quickly. The focused
`recovery.mjs` fixtures separately examine whether a clean vent retrial can fit after capture;
these use an explicit capture setup and are not included in cohort win rates.

The recovery fixtures first let normal simulation run in bed until the chosen remaining time, then
invoke one explicit capture, skip the escort, and attempt an earned-card vent run with the wary
prison state. Results in [recovery-results.json](../../tools/review/recovery-results.json):

| Time left before capture | Result | Time left afterward |
| --- | --- | --- |
| 240 s | Won, earned the card again | 73.09 s |
| 150 s | Headcount loss | 0 |
| 100 s | Headcount loss | 0 |

The later losses show that this particular careful recovery plan ran out of time. They do not
prove the state was unwinnable: another route or the rushing exploit might still succeed. These
fixtures grant neither tools nor the keycard, but the capture itself is deliberately injected.

## Code review and future-feature risks

### R10. Several interactions ignore height — medium

**Found:** A keycard or camera panel can be in reach with the player's feet five metres above it.
That disagrees with ordinary pickups' height limit. It is a latent sequence-break risk as soon as
new platforms or grapple paths pass above objectives, rather than a proven current escape shortcut.

**Evidence:** `site/js/game/keycard.js:10` and `interact.js:14` check only x distance;
`items.js:22` additionally limits height to 0.6 m. `probes.json`, `interactHeight`, reproduces both.
`snitch.js:90` similarly lacks a height check for opening/attacking a cell.

**Suggested fix:** Centralize an explicit interaction-reach rule that takes x, y, and the target's
interaction point. Add tests above and below each kind of objective before adding grapple routes.
Keep any deliberate remote interaction as a named exception.

### R11. Capture explanations can refer to the wrong alarm — medium

**Found:** The score stores one world-wide last alarm, then measures a later grab from that record.
A new room or a re-alert inside an existing hunt can therefore produce a misleading '! to grab'
explanation. It does not necessarily measure the grabbing guard's most recent reaction pause.
The live victory text also said "nobody knows" despite three guard sightings.

**Evidence:** `site/js/game/alert.js:62` returns early if anyone in that room is already Alert;
line 64 writes one `world.lastAlarm`. `grab.js:28` uses that global record. Step 14 deliberately
counts one hunt, so tally deduplication must not suppress per-guard timing information.
`site/js/render/end-screen.js:16` always uses the same clean-sounding victory sentence.

**Suggested fix:** Track each guard's latest transition into Alert separately from score counting,
and snapshot that guard's cause/room at grab time. Test a re-alert and a cross-room escape. Use
outcome text appropriate to Ghost, Shadow, and Inmate. This is a code-path risk; the browser run
verified the victory-text contradiction, not every possible attribution failure.

### R12. The separation is good; state and spatial assumptions will constrain expansion — medium

**Found:** Node-compatible logic, data-driven rooms, separate drawing, named config values, and
fixed-step updates are substantial strengths. The next risks are shared-state lifecycle and the
flat AI model, not a need to rewrite the project into a framework.

**Evidence:** `world.js:39` builds a large mutable state with Sets, room references, transient input
latches, hold/grab state, and presentation events. `world.js:231` coordinates sensing/AI/radio;
`guard-ai.js:58` pursues only x; `guard.js:96` caches height-specific obstacles at creation or room
entry. `rooms.js:18` mixes room data with concrete feature identifiers. `solitary.js:39` must reset
many of those fields manually. More transitions multiply the risk of stale movement or hold state.

**Suggested fix:** Before saving, define a versioned save schema of stable room/entity ids, inventory,
timer, guard states, and Set contents; explicitly exclude transient input/presentation fields.
Round-trip it through real JSON and resume through `stepWorld`. Before grapple/vertical AI, define
reachable surfaces and navigation links, then split movement into climb/jump/slide/collision modules
when the next feature actually requires it. Share one player-relocation/reset helper between room
entry and solitary, with tests for arriving from midair or during a dash. Avoid a wholesale refactor
while Adam is still deciding whether the core loop is fun.

### R13. Old-laptop risks need GPU evidence — medium

**Found:** The live browser HUD showed roughly 54–60 fps at 100% during the rushing check. This was
not a 2015 MacBook Air measurement. The design already avoids shadows and post-processing and adapts
resolution; those are good choices. There are still plausible CPU allocation and GPU/light costs.

**Evidence:** `render/stage.js:20` caps pixel ratio at 1.5 and uses adaptive resolution.
Every awake guard gets a real SpotLight (`render/guard-view.js:55`), plus transparent fan geometry.
`camera.js:71` recomputes a searchlight fan/pools for detection; `visibility.js:19` queries it again
for the look; `render/yard-views.js:124` and `render/debug-view.js:59` draw it again.
With an exposed player, each searchlight can be recomputed at 120 Hz plus several 60 Hz view paths.
`site/js/main.js:130` rebuilds the entire room scene when a radio guard enters/leaves, using the
allocation/disposal path at line 81. `sight.js:118` allocates arrays for each lit fan.

**Suggested fix:** Cache each light shape per simulation tick and reuse the latest shape for the
look and drawing. Profile before batching room meshes, reducing decorative lights, or replacing
whole-scene rebuilds with guard-view updates. On the actual Intel HD 6000, measure Mess Hall and
Yard at 100% and `?low`, including a radio arrival and a chase: median/p95 frame time, quality level,
draw calls, and a several-minute memory trend. Target p95 under 16.7 ms for 60 fps, or document an
explicit lower-quality fallback. The headless logic timings in `probes.json` deliberately hide the
player to prevent capture; they do not benchmark exposed searchlight geometry or GPU rendering.

### R14. The main gaps are behavioral and visual, despite 433 green tests — medium

**Found/evidence:** Existing coverage is broad, but it proves mostly isolated rules and ideal clean
routes. `tests/clean-run.test.mjs` has no hostile-policy control. `tests/playtest-4.test.mjs:70` checks
cone clipping, not equivalence between every detected body and the drawn fan. The shared watcher
check in `tests/readable.test.mjs:37` compares senses against the player look, so it cannot expose
R5's independent beam mismatch. `tests/playtest-5.test.mjs:365` checks stored noise pings, not their
rendered reach. No existing test protects full off-screen arrows or a sustained slide tradeoff.
The recovery-win test cited in R9 grants the card instead of replaying its retrieval.

**Suggested fix:** Promote the narrow reproductions into game/render regression tests when Claude
implements the corresponding fixes. Add an aggressive full-run regression, with a design-approved
outcome target, alongside the clean route tests. Assert actual earned inventory and correct route
visits; classify planner failure separately from game loss. Test save/resume only when saving is
implemented. Do not replace player feel testing with bot pass counts.

## Balance numbers: suggestions only

### R15. Tune tradeoffs before changing basic movement or the clock — medium

The following are experiments, not applied changes. The strongest evidence is R1/R2; the awareness
suggestions are secondary and should follow the drawing fixes. Each row identifies the current
config evidence and the exact proposed trial value or reason to retain it.

| Setting in `site/js/game/config.js` | Current | Suggested trial |
| --- | --- | --- |
| `moves.slideSpeed`, line 352 | 7 | Keep 7; add `slideRecoverySeconds: 0.35` |
| `guard.searchingDetectBoost`, line 119 | 3 | 2 |
| `guard.suspiciousDetectBoost`, line 118 | 1.5 | Keep 1.5 initially |
| `awareness.stillFactor`, line 265 | 0.5 | Compare 0.75 after fixing escape dominance |
| `guard.detectNearSeconds` / `detectFarSeconds`, lines 112–113 | 0.8 / 2 | Keep 0.8 / 2 initially |
| `camera.fillSeconds`, line 169 | 1.2 | Keep 1.2; fix the geometry first |
| `guard.alertSpeed` / `player.runSpeed`, lines 93 / 53 | 5.2 / 6.5 | Keep both initially |
| `knockout.wakeSeconds`, line 218 | 75 | Keep 75 |
| `radio.intervalSeconds`, line 311 | 60 | Keep 60 |
| `solitary.penaltySeconds`, line 271 | 60 | Keep 60 pending human recovery tests |
| `headcountSeconds`, line 5 | 420 | Keep 420 |

**Why these values:**

- Slide recovery restores a real speed/noise tradeoff without slowing Adam's preferred movement burst.
- Search boost 2 gives about 0.8 s to '!' for a still player at close range, instead of the measured
  0.53 s under 3x. This targets being rediscovered while hunting, not all initial encounters.
- Still factor 0.75 would make an unmoving camera exposure take 1.6 s, or 3.2 s crouched, instead of
  2.4/4.8 s. Test it as an alternative, not an automatic change: freezing is an intended new tactic.
- A moving rusher crosses the Stairwell camera's 2.4 m strip in about 0.37 s; a 1.2 s fill cannot
  catch a single clean crossing. Lowering the meter to under 0.37 s would undo Step 14's warning
  goal. Solve checkpoint/escape layout and pursuit rather than blindly accelerating every meter.
- Run exceeds chase by 1.3 m/s. The 0.6 s reaction pause already gives 3.9 m of running travel;
  at 6.5 m/s, a 0.35 s lunge tell allows another 2.28 m. These are generous deliberate escape
  windows. Do not remove them to compensate for the doorway reset.
- The 75 s KO versus 60 s radio cycle guarantees a missed call without interrogation, but a fast
  run can end before either matters. The measured responder actually arrives; the system is working.
- At departure zero, clean front/drop, vent, and roof took 95.36, 82.14, and 133.54 s. All finish
  before the 210 s bed check. That makes bed/dummy systems mostly relevant to exploration and
  mistakes, not mastered routes. Adam's prior ten-seconds-left win is a reason not to cut 7:00
  on the basis of these bots. Preserve the clock while fixing route risk.

## Suggested task cards for Adam to copy

These are proposed cards, not edits to TASKS or authorization to change the game's design.

1. **Restore a reason to sneak at room exits** (high; R1).
   Prototype pursuit through one normal doorway or an equally legible escape cost. Keep run/chase
   speeds and the lunge pause. Acceptance: replay the 30 rusher phases and all clean routes;
   show the before/after counts. A nonstop runner should face an actual escape decision while
   a successful hidden pass and vent/drop escape remain reliable. Adam approves the behavior target.
2. **Unify flashlight and security-camera drawing with checks** (high; R5).
   Reproduce guard x=10/player x=10.1 crouched and camera aim=16.5/player x=15.3 standing.
   Draw any close-awareness exception explicitly. Acceptance: detected body samples agree with
   drawn shapes across standing/crouching/sliding/jumping, cover edges, and both facings.
3. **Give watched hiding a readable reach-in tell** (medium; R6).
   Reproduce the locker fixture at one-third awareness. Trial 0.35 s reach-in, with a clear
   "He saw you hide" cue. Acceptance: hide safety and known-spot rules stay intact; a player can
   leave during the tell, and the explanation names the actual cause.
4. **Balance sustained slides while keeping the burst** (medium; R2).
   Trial 0.35 s recovery. Acceptance: chained slides no longer exceed sustained running speed;
   a single slide, low-ceiling extension, jump buffering, and controller inputs remain responsive.
5. **Keep full awareness visible off screen** (medium; R7).
   Show the red edge arrow during Alert when the guard's ordinary '!' is outside the viewport.
   Acceptance: all four edges, smart/close/wide cameras, no duplicate on-screen full icons.
6. **Draw noise reach immediately and dim stunned flashlights** (medium; R8).
   Keep the expanding animation inside a full-radius boundary; use the actual noise origin.
   Acceptance: hearing boundary and rendered boundary match for footsteps, doors, throws, dash,
   and landing. A stunned guard's beam no longer suggests he can currently detect the player.
7. **Apply height-aware interaction reach consistently** (medium; R10).
   Share target-point reach for card, panel, cells, pickups, and future grapple interactions.
   Acceptance: fixtures five metres above/below targets fail; normal ground interactions pass.
8. **Record per-guard Alert timing separately from spotted tally** (medium; R11).
   Keep one spotting per hunt, but retain each guard's current alarm cause/time. Acceptance:
   a re-alert and a cross-room capture report the correct guard, room, and reaction interval;
   an Inmate victory does not claim nobody knows.
9. **Verify recovery with an earned keycard** (medium; R9/R14).
   Capture once, skip or watch the escort, retrieve the returned keycard, and win through actual
   inputs. Cover retained screwdriver/boots and early/late captures. Report which late starts
   genuinely run out of time; do not grant the goal item to prove recoverability.
10. **Make interrogation's useful radio payoff clearer** (low; R3).
    Show the next call due or explain what a missed call brings. Clarify the sleeper's off-radio
    status. Acceptance: one press of Q, progress, learned code, and a suppressed responder can all
    be understood without opening debug. Keep pull-ins unchanged for this experiment.
11. **Profile the target MacBook and share geometry work** (medium; R13).
    Capture the specified indoor/outdoor performance measures on Intel HD 6000. Cache light shapes
    only after confirming the repeat work. Acceptance: identical detection/drawing, bounded memory
    after repeated room/radio transitions, and documented p95 frame time at each quality level.
12. **Define save and vertical navigation contracts before adding them** (medium; R12).
    Add a versioned JSON schema and relocation invariants when implementing saving/grapple.
    Acceptance: save/load resumes a midair, hidden, held, and post-solitary state without stale
    input or inventory duplication; new guard navigation has explicit reachable surfaces.

## Verification and limits

The review adds only files under `docs/reviews/` and `tools/review/`. The second complete `npm test`
run also passed **433/433**, zero failures/skips, in 111.72 seconds while review work was active.
Its output is retained in [test-final.log](../../tools/review/test-final.log).
All added text lines were checked to be under 120 characters; no artifact exceeds 500 KB.

The live browser check established a complete rushing escape and readable score output. It did not
establish whether hiding feels tense to a person, whether animation/input latency matches Hollow
Knight, or whether sounds/rumble communicate well. No physical controller or Intel HD 6000 was tested.
The movement tests cover instant start/stop, variable jump height, coyote time, and buffering;
those are encouraging implementation properties, not a substitute for Adam's hands-on feel verdict.
