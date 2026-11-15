# Shove playtest: why it feels wrong

## Adam: my recommendation

**Fix accidental shoves first.** Space can turn an attempted quiet grab into a loud attack because
of a 30 cm difference in reach. Give shove a deliberate input, and keep an unseen rear grab from
falling back to shove. Keep pull-ins unchanged.

A ledge shove could be fun, but it is an additional mechanic. Longer stun buys time; bigger push
gets clamped at tower edges. Neither resolves the surprising action selection.

## What your run actually establishes

Your score establishes a final capture by Tower 1 about 1.9 s after an Alert attributed to a shove,
an earlier solitary trip, four knockouts, three pull-ins, and three sightings classified as Other.
It does **not** establish exactly three shoves. Other also includes a sleeper waking, empty bed,
released/slammed guards, and a guard breaking free. Several shoves in one hunt need not add several
sightings. Count shove actions separately before showing a "Shoves" row.

The explanation you pasted also combines two captures: a solitary trip had already happened before
the final Caught outcome in the Yard. The excerpt cannot reconstruct your exact climbing path,
where you moved after the shove, or which event caused each Other sighting.

## What I tested

- Source: Step 15, `4a504e0`; branch `codex-review-1`, advanced to current main before review work.
- Shove implementation is unchanged from the Step 14 source used for the earlier review.
- Baseline `npm test`: **459 passed, zero failures/skips**, 173.01 s.
  [Test output](../../tools/review/shove-test-baseline.log).
- Production logic: 144 six-second fixtures: three configurations, two locations, four positions,
  and six responses. Plus four edge-clamp probes, three rear two-tap probes, and one stun follow-up.
- Live browser build `35cacb3786c6`: keyboard-only rear approach on Tower 1, Space showing "shove",
  then no movement. The guard changed from Calm/unseeing to Alert and grabbed the player.
  [Browser evidence](shove-browser.jpg), [HUD observations](../../tools/review/shove-browser.json).

Run `node tools/review/shove-playtest.mjs`. [Script](../../tools/review/shove-playtest.mjs),
[raw results](../../tools/review/shove-results.json). These are fixtures, not full-run win rates.
The tower setup advances normal patrols for two seconds while hiding the player for setup, then
places the player at the stated x and y=5.8. This keeps the ground guard out of the initial drop
attack radius. The flat fixture has one guard and finite room walls. Hypothetical variants invoke
the exported shove function with a copied config; production code/config remain unchanged.

## Findings

### 1. A quiet rear grab becomes a shove just outside grab reach — high

With Tower 1 at x=34.6, facing left, I pressed Space twice:

| Player x | Rear distance | First action | Result |
| --- | --- | --- | --- |
| 35.4 | 0.8 m | Grab | Quiet knockout; searchlight turns off |
| 35.8 | 1.2 m | Shove | Alert, no knockout; searchlight stays on |
| 36.0 | 1.4 m | Shove | Alert, no knockout; searchlight stays on |

The guard was unaware at the start. At x=35.8 the push only moved him 0.8 m because his tower
bounds stop him. With no escape input, Tower 1 grabbed the player about 2.02 s after that shove.
The browser independently confirmed the same rear-action problem near x=35.7.

**Evidence:** `site/js/game/config.js:214` gives grabs 1.1 m; line 231 gives shoves 1.4 m.
`knockout.js:103` falls through to shove when no grab is available. `shove.js:17` requires an awake
guard in reach, but does not require that he sees the player or is chasing. The prompt accurately
changes to "SPACE: shove", but requires noticing a tiny text change during the approach.

**Suggested fix:** Behind an unaware guard, Space should grab or show "Move closer to grab".
Make a shove intentional through a distinct input/modifier, with a keyboard/controller controls
audit. Add a test for rear distances 1.09, 1.11, and 1.39 m and for a guard turning during approach.
This is a mismatch in player intent even though the code follows its current priority rules.

### 2. The move gives one escape window, with no stun follow-up grab — medium

From x=33.9, facing Tower 1, the ordinary shove displaced him 1 m. Remaining still produced a
lunge at 1.61 s and a grab at **1.96 s** after the shove. The isolated flat-floor case was the same.
That closely reproduces the timing in your score without needing a missing reaction pause bug.

Stun lasts 1.5 s, shove cooldown lasts 8 s, and shoving explicitly removes the normal 0.6 s reaction
pause. At the 1.96 s grab, about six seconds of shove cooldown remain. Pressing Space again during
the early stun did not extend protection. In a separate close rear placement during the stun,
Space refused the shove and did not grab: an Alert guard cannot be grabbed even while stunned.

**Evidence:** `shove.js:49` sets stun; lines 51–55 reset reaction/lunge and start cooldown.
`knockout.js:28` excludes Alert guards from grabs. `config.js:234` and line 236 set 1.5 s and 8 s.

**Suggested fix:** Decide whether shove is strictly "make space and escape" or can start a deliberate
stun-and-grab sequence. If escape-only, show "RUN / JUMP AWAY" while he staggers and explain that
Space cannot finish him. If follow-up grabs are desired, trial a deliberate rear grab during stun,
with other guards still Alert and no automatic knockout. Measure that separately before adoption.

### 3. Tower edges can erase the push — medium

Pushing toward the right edge gave these exact results; guard height remained 5.8 m in every case:

| Guard before | Guard after | Actual push |
| --- | --- | --- |
| 33.8 | 34.8 | 1.0 m |
| 34.6 | 35.6 | 1.0 m |
| 36.4 | 37.2 | 0.8 m |
| 37.2 | 37.2 | 0.0 m |

**Evidence:** `shove.js:45` clamps to guard bounds; Tower 1 bounds are [33.8, 37.2] in
`rooms.js:359`. Guards have no falling step here. A bigger push cannot overcome that clamp.

**Suggested fix:** If adopting option A, implement a visible stagger/fall transition and a defined
landing result, rather than increasing `pushMetres` alone. Specify platform crossing, collision,
long stun versus knockout, body discovery, and the tower searchlight's behavior after the fall.
Treat this as a separate feature with tests; keep the existing quiet tower takedown worthwhile.

### 4. There is an escape, but "run" can send you into another guard — medium

Same front shove and initial tower phase, production rules:

| Immediate response | Result within six seconds |
| --- | --- |
| Stay | Tower 1 grabs at 1.96 s |
| Run left | Fall off tower; ground guard grabs at 2.05 s |
| Run right | Leave tower; ground guard grabs at 3.05 s |
| Run + jump left | Reaches roof ledge; no grab during the observation window |

Shoving raises Alert across the Yard, not only for the victim. So the tiny tower is not an
inescapable trap, but a generic "run" hint is poor advice for this particular space.
The jump case establishes a roof escape in this fixture, not a complete winning route.

**Evidence:** `alert.js:47` alerts all conscious guards in the room, regardless of the 8 m noise
radius. `rooms.js:329` defines the platform/roof gap. Raw event guard ids distinguish the ground
captures from Tower 1's capture.

There is also a surprising contextual rescue: pressing Space around 1.65 s in this tower fixture
selected a **drop attack on the ground guard**, taking the player off the tower. It did not shove
again or knock out Tower 1. Target priority changes during the encounter (`knockout.js:96`).

**Suggested fix:** Use a directional escape hint near this tower and make the selected target clear.
Keep drops, but ensure the drop marker/prompt names the actual target. Do not describe all failed
shoves as a player's refusal to run; the route and other guards matter.

## Options B and C measured without applying them

Single front shove, stay still, guard initially 0.7 m away. Times are from shove to first grab:

| Configuration | Flat floor | Tower 1 |
| --- | --- | --- |
| Current: stun 1.5 s, push 1 m | 1.96 s | 1.96 s |
| B: stun 2.5 s, push 1 m | 2.97 s | 2.97 s |
| C: stun 1.5 s, push 2 m | 2.16 s | 2.16 s |

Longer stun reliably buys about one extra second. Doubling push bought only 0.20 s here because
chase speed closes the extra distance quickly. At a clamped tower edge, additional push can buy
nothing. A full ledge knock-off is not implemented, so I did not pretend to simulate option A.
No choice was applied. These fixtures support fixing intent/feedback first, then testing an edge
interaction if Adam wants heights to become a combat tool.

## Suggested cards for Claude Code

1. **Protect rear-grab intent.** Behind an unseen guard, an out-of-range grab must not silently
   become a shove. Add a closer-to-grab cue. Make shove deliberate and audit controller mapping.
   Acceptance: 1.11–1.39 m rear attempts raise no alarm; intended frontal shove still interrupts a lunge.
2. **Show the real escape window.** Show stun recovery and a run/jump cue; distinguish it from the
   eight-second cooldown. Acceptance: the player can tell when the guard can act again. Document
   whether a stunned guard can be grabbed and test that rule explicitly.
3. **Track actions separately from sightings.** Add a shove-action counter and cause breakdown for
   Other sightings. Acceptance: two shoves in one hunt show two actions but retain intended spotting
   deduplication; empty-bed/sleeper events do not get mislabeled as shoves.
4. **Optional ledge shove prototype.** If Adam chooses A, add an explicit fall/landing state and
   readable edge tell. Acceptance: edge push has a visible result, no guard clipping/teleporting,
   and agreed consequences for knockout, searchlight, and radio. No global stun buff bundled in.

## Limits

This does not replay your actual input recording, which was not supplied. The browser check tests
keyboard presentation, while exact timings come from 120 Hz production logic. Controller feel,
rumble, and audible feedback were not judged. No game code, tests, DESIGN, or TASKS were edited.
