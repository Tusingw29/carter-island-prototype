# Carter Island: task board

One task per build step. The spec is in [DESIGN.md](DESIGN.md).

**Status values:** `todo` / `in progress` / `review, awaiting Adam's verdict` / `done`

**Rules for the board**

- Only Adam moves a task from "review, awaiting Adam's verdict" to "done".
- One step at a time. Do not start the next step until Adam has given a verdict on the last.
- Every step ends with a playable build on the live link and the four playtest questions
  at the bottom of this page.

> **Needs Adam's confirmation:** the setup brief said "Steps 1 to 6 below", but no step list
> came with it. The six steps here are a proposed split of the spec, ordered so the riskiest
> question (is sneaking past a guard fun?) is answered first. Reorder or rewrite freely.

Live link: https://tusingw29.github.io/carter-island-prototype/

| Step | Task | Status | Branch |
| --- | --- | --- | --- |
| 0 | Repo, tests, deploy, docs | review, awaiting Adam's verdict | `main` |
| 1 | One room: sneak, hide, one guard | todo | `step-1-sneak-and-hide` |
| 2 | Full map, doors, timer, bed | todo | `step-2-map-and-timer` |
| 3 | Screwdriver, vents, cameras, keycard | todo | `step-3-vents-and-keycard` |
| 4 | Knockouts, bodies, getting grabbed | todo | `step-4-knockouts-and-grabs` |
| 5 | Inmates, bed check, dummy | todo | `step-5-inmates-and-bed-check` |
| 6 | Score screen, ranks, tuning pass | todo | `step-6-score-and-tuning` |

---

## Step 0: Repo, tests, deploy, docs

- **Status:** review, awaiting Adam's verdict
- **Branch:** `main`
- **Done means:**
  - Public repo exists with plain ES modules, no build step, vendored Three.js, Node tests.
  - Pushing to `main` runs the tests and deploys to GitHub Pages only if they pass.
  - JS and CSS URLs carry a build stamp so returning players never mix old and new code.
  - `CONTRIBUTING.md`, `docs/DESIGN.md`, `docs/TASKS.md`, and `README.md` are written.
- **How Adam tests it:**
  1. Open the live link. You should see "Carter Island prototype, coming soon".
  2. Look at the small grey line under it. It should show a build id (12 letters and
     numbers, not "dev"), "Three.js r180", and "headcount timer 9:00".
  3. Read the six proposed steps below and say whether the split and order are right.

## Step 1: One room: sneak, hide, one guard

- **Status:** todo
- **Branch:** `step-1-sneak-and-hide`
- **Scope:** The Cell Block only. Player movement (walk, run, crouch) on keyboard and
  controller. One guard on a fixed patrol with a flashlight cone that is his vision.
  Noise from walking, running, crouching. Hide spots: lockers and one pitch-dark spot.
  Alert levels Calm, Suspicious, Alert, Searching, back to Calm. Debug mode on F1 (vision
  cones, noise rings, guard state labels, patrol paths). No timer, items, or other rooms yet.
- **Done means:**
  - You can walk, run, and crouch, and the guard reacts differently to each noise level.
  - Stepping into the flashlight cone gets you seen; a locker or standing still in the
    dark spot hides you.
  - The guard goes through all four alert levels and returns to the same patrol every time.
  - Player, guard, alert, and noise logic have Node tests and run with no rendering.
- **How Adam tests it:**
  1. Hide in a locker and let the guard walk past. Then do the same in the dark spot.
  2. Run behind the guard and watch him turn to check the noise. Crouch behind him and
     confirm he does not.
  3. Get seen on purpose, break line of sight, hide, and watch him search and calm down.
  4. Press F1 and check the cone, noise ring, and state label match what you felt.
  5. Answer playtest question 1. If hiding is not tense here, stop and retune before Step 2.

## Step 2: Full map, doors, timer, bed

- **Status:** todo
- **Branch:** `step-2-map-and-timer`
- **Scope:** All six areas as block rooms with their guards on fixed patrols, connected by
  doors, hallways, and stairs (vents come in Step 3). Back-wall interaction with Up/W.
  Creaky doors: tap for fast and loud, hold for slow and quiet. More hide spots: laundry
  carts, under tables, under the desk, tool shelves. The headcount timer (config value,
  9:00). Your bed, with win and lose at 0:00 as a plain message. Map screen that fills in
  as you enter rooms. Pause.
- **Done means:**
  - You can walk the front door route from your cell to the Guard Office and back.
  - Each room takes roughly 30 to 60 seconds to sneak through.
  - The timer counts down without stopping, and the run ends at 0:00 in or out of bed.
  - The map shows visited rooms and doors, and toggles with M or Select.
- **How Adam tests it:**
  1. Walk the front door route to the Guard Office with a stopwatch feel for each room.
  2. Tap a creaky door near a guard, then hold it open slowly near the same guard.
  3. Open the map in a few rooms and check it matches where you have been.
  4. Let the timer run out once in bed and once out of bed.
  5. Answer playtest question 2.

## Step 3: Screwdriver, vents, cameras, keycard

- **Status:** todo
- **Branch:** `step-3-vents-and-keycard`
- **Scope:** Screwdriver pickup in the Laundry; vent covers need it. The vent route:
  Maintenance vent, up the wall, along the duct above the Mess Hall with peek-down grates,
  into the Guard Office. The one-way drop from the Guard Office to the Cell Block. The
  welded vent teaser. Sweeping cameras, and the Maintenance panel that turns off the
  Stairwell camera. The keycard with slow grab, fast grab, the stirring guard, and the
  silent alarm. Vents shown on the map. Winning now needs the keycard, and Sleep in bed
  ends the run early.
- **Done means:**
  - The full loop is playable start to finish by both the front door and the vent route.
  - Vents refuse to open without the screwdriver, and the drop only works from the office.
  - Slow grab, fast grab, and silent alarm each produce the outcome in the spec.
  - A camera seeing you sends nearby guards to Suspicious; the panel turns the camera off.
- **How Adam tests it:**
  1. Try a vent before getting the screwdriver, then after.
  2. Do one full run by the vent route and one by the front door. Compare how they feel.
  3. Take the keycard three ways: hold, tap, and tap while the camera watches.
  4. Take the drop home and get into bed before 0:00.
  5. Answer playtest question 3.

## Step 4: Knockouts, bodies, getting grabbed

- **Status:** todo
- **Branch:** `step-4-knockouts-and-grabs`
- **Scope:** Knock out a guard from behind. Drag the body and stuff it in a locker or
  cart. A guard who finds an unhidden body goes Alert. Searching guards check hide spots
  near where they lost you. Getting grabbed during Alert, the one mash-to-break-free chance
  per run, and the run ending on the second grab. Knocking out the office guard triggers
  the silent alarm.
- **Done means:**
  - Knockouts only work from behind, and a hidden body is never found.
  - A guard walking past an unhidden body goes Alert every time.
  - The first grab can be escaped by mashing; the second ends the run.
  - A searching guard sometimes opens the spot you are hiding in.
- **How Adam tests it:**
  1. Knock out the Cell Block guard, leave the body, and wait for another guard to find it.
  2. Repeat, but hide the body in a locker.
  3. Get caught on purpose, mash free, then get caught again.
  4. Hide close to where a guard lost you and see whether he checks your spot.
  5. Answer playtest question 1 again. Did knockouts make hiding less tense?

## Step 5: Inmates, bed check, dummy

- **Status:** todo
- **Branch:** `step-5-inmates-and-bed-check`
- **Scope:** Snitch inmates with small vision cones who yell and send the nearest guard to
  your spot. Opening their cells with the keycard and knocking them out. The trader inmate,
  the cigarettes in the Mess Hall kitchen corner, and his hint about whichever of the
  vents, camera panel, or one-way drop you have not found yet. The bed check at 5:00
  remaining. Bedsheets in the Laundry, building the dummy, and placing it in your bed.
- **Done means:**
  - A snitch who sees you brings the nearest guard to that spot.
  - With the keycard, a snitch's cell opens and he can be knocked out.
  - The trader gives a hint about something you have not found, and never repeats a known one.
  - At 5:00 the guard checks your cell: empty bed is Alert, you or the dummy is safe.
- **How Adam tests it:**
  1. Walk in front of a snitch's cell and watch the guard come.
  2. Be out of bed at 5:00 with no dummy. Then replay with the dummy placed.
  3. Bring the cigarettes to the trader on a fresh run, and again after using the vents.
  4. On the way home with the keycard, open a snitch's cell and knock him out.
  5. Answer playtest questions 2 and 4.

## Step 6: Score screen, ranks, tuning pass

- **Status:** todo
- **Branch:** `step-6-score-and-tuning`
- **Scope:** Score screen with time left, times spotted, knockouts, and bodies found by
  guards. Ranks: Ghost, Shadow, Inmate, Caught. "Play again" button. Debug timer controls.
  A tuning pass on timer length (8 to 10 minutes), guard speeds, cone sizes, and noise
  ranges using Adam's notes from Steps 1 to 5. Final check that every control in the spec
  works on keyboard and controller.
- **Done means:**
  - Every run ends on the score screen with the right numbers and the right rank.
  - "Play again" starts a clean run with identical guard patrols.
  - A full run is possible on a controller alone.
  - Tuning values agreed with Adam are in `config.js`.
- **How Adam tests it:**
  1. Play three runs aiming for Ghost, Shadow, and Caught, and check each rank is right.
  2. Play one whole run using only a controller.
  3. Use the debug timer controls to try 8:00 and 10:00.
  4. Answer all four playtest questions. This is the "is the core loop fun?" verdict.

---

## Playtest questions (ask Adam after each build)

1. Did hiding while a guard walked by feel tense?
2. Did the timer feel exciting, or just stressful?
3. Did the vent shortcut feel like a reward?
4. Did you want to play again to do it faster or cleaner?

## Open questions about the spec

Answers go here once Adam has decided, then into the matching step.

1. **Which six steps?** See the note at the top of this page.
2. **"Getting spotted costs time."** Is that only the time you lose hiding and waiting, or
   should being spotted also take seconds off the timer? Assumed: no direct penalty.
3. **Map versus area notes.** The map draws a vent from the Mess Hall down to Maintenance
   and a vent from the Vent Duct down to the Cell Block. The route text says the vent runs
   from Maintenance up the wall to the duct above the Mess Hall, and the Cell Block's only
   vent is the exit of the one-way drop from the Guard Office. Assumed: the route text is
   right, and the duct has no opening into the Mess Hall or Cell Block other than grates
   you can peek through.
4. **Stairs to the Guard Office.** The map shows stairs straight down from the Guard Office
   next to the Stairwell. Assumed: those are the Stairwell Checkpoint's stairs, so the
   office has exactly two ways in (stairwell door, duct) and one extra way out (the drop).
5. **Bed check versus the win.** If the bed check goes Alert because the bed was empty, is
   the run still winnable by getting back in bed? Assumed: yes, guards chase as in any Alert.
6. **Sleep action and the dummy.** If the dummy is in the bed, do you have to remove it
   before you can get in? Assumed: getting in bed swaps you for the dummy automatically.
7. **Break free button.** Space / X is both knockout and break free. Assumed fine, since you
   cannot do both at once.
8. **Camera with no guards nearby.** Maintenance has a camera but no guards. Assumed: its
   alert reaches the Laundry guard next door.
