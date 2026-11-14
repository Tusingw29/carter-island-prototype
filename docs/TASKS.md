# Carter Island: task board

One task per build step. The spec is in [DESIGN.md](DESIGN.md). The six steps are Adam's.

**Status values:** `todo` / `in progress` / `review, awaiting Adam's verdict` / `done`

**Rules for the board**

- Only Adam moves a task from "review, awaiting Adam's verdict" to "done".
- Each step is built on its own branch and merged to `main` when its tests pass, because
  the live link only ever shows `main`.
- "How Adam tests it" is filled in with exact steps when a task goes to review.

Live link: https://tusingw29.github.io/carter-island-prototype/

| Step | Task | Status | Branch |
| --- | --- | --- | --- |
| 0 | Repo, tests, deploy, docs | review, awaiting Adam's verdict | `main` |
| 1 | Core feel in one room | review, awaiting Adam's verdict | `step-1-core-feel` |
| 2 | Full stealth system | review, awaiting Adam's verdict | `step-2-stealth` |
| 3 | Full map, timer, keycard, win and lose | todo | `step-3-map` |
| 4 | Screwdriver and vents | todo | `step-4-vents` |
| 5 | Inmates, bed check, dummy, camera panel | todo | `step-5-inmates` |
| 6 | Polish, ready to share | todo | `step-6-polish` |

---

## Step 0: Repo, tests, deploy, docs

- **Status:** review, awaiting Adam's verdict
- **Branch:** `main`
- **Done means:**
  - Public repo exists with plain ES modules, no build step, vendored Three.js, Node tests.
  - Pushing to `main` runs the tests and deploys to GitHub Pages only if they pass.
  - JS and CSS URLs carry a build stamp so returning players never mix old and new code.
  - `CONTRIBUTING.md`, `docs/DESIGN.md`, `docs/TASKS.md`, and `README.md` are written.
- **How Adam tests it:** open the live link and check the game loads. Turn on debug mode
  (F1) and check the first line shows a build id that is not "dev".

## Step 1: Core feel in one room

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-1-core-feel`
- **Scope:** The Cell Block as a single test room. 2.5D side view, blocks and flat colors,
  dim lights-out lighting. Player walk, run, and crouch on keyboard and controller, tight
  like Mega Man X. One locker: Up to hide, Up again to come out; hidden means unseen. One
  guard on a fixed patrol with a flashlight vision cone, and a "!" over him when the player
  is in the cone and not hidden. No chase. Noise ring for walk, run, and crouch, in debug
  mode only. Debug toggle showing vision cones, noise rings, and the guard's state.
- **Done means:**
  - Movement starts and stops instantly at the configured walk, run, and crouch speeds.
  - Every control works on keyboard and on a standard-mapping controller.
  - Standing in the cone shows "!"; being in the locker never does.
  - The guard's patrol is identical every run.
  - Movement speeds, the vision cone check, and hiding are tested in Node with no rendering.
- **How Adam tests it:**
  1. Open the live link. Walk with A/D, hold Shift to run, hold S to crouch-walk. Tap
     left and right quickly. It should start and stop dead, with no slide.
  2. Do the same on a controller: left stick or D-pad to move, Right Trigger to run,
     Down to crouch.
  3. Walk into the guard's flashlight. A red "!" appears over him and the beam turns red.
     Step out and both go back to normal.
  4. Stand at the locker (a "UP: hide" tag appears) and press W. Let the guard sweep his
     light right across the locker. No "!". Press W again to come out.
  5. Press F1 (or the ` key, top left of the keyboard, if F1 changes your screen
     brightness). Check the green noise ring: small when walking, large when running, gone
     when crouching or still. Check the guard label reads CALM or SEES PLAYER.
  6. Sneak up behind the guard while crouched, then follow him.
  7. Playtest question 1: did hiding while the guard walked by feel tense?
- **Known limits, on purpose:** the guard does not react to noise or chase yet, and you
  can walk straight through him. Both arrive in Step 2.

## Step 2: Full stealth system

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-2-stealth`
- **Scope:** Still the Cell Block test room. Alert levels Calm, Suspicious, Alert,
  Searching, back to Calm. Guards react to noise (go Suspicious and walk to the spot) and
  to sight. Searching guards check nearby hiding spots. Knockout from behind, drag the
  body, stuff it in a locker; a guard who finds an unhidden body goes Alert. Getting
  grabbed during Alert, with one mash-to-break-free chance per run; the second grab shows
  "Caught" and a restart button. Pitch-dark spots that hide you while you stand still. A
  second guard and a laundry cart. Guard state icons ("?" and "!"), a simple alert meter,
  and simple sound cues.
- **Done means:**
  - Every alert state change in the spec happens and is covered by a test.
  - Knockouts, body discovery, and break-free are covered by tests.
  - The icons and the alert meter always match the guards' real state.
- **How the rules work (so you know what you are testing):**
  - Sight fills a meter instead of being instant. At the far edge of the beam it takes over
    a second; right in front of the guard it takes a third of a second. About a third full,
    he goes Suspicious ("?") and walks over. Full, he goes Alert ("!") and so does everyone.
  - Running is heard 8 m away, walking 2.5 m, crouching never.
  - Alert guards are faster than your walk and slower than your run.
  - Getting into a locker, cart, or dark spot while a guard is watching does not work. He
    walks over and pulls you out.
  - Searching guards check every hiding spot within 7 m of where they lost you. Spots
    further away are safe. This is fixed, not random, so you can learn it.
  - A body stuffed in a locker or cart is never found. That spot is then full.
- **How Adam tests it:**
  1. Noise: run behind the left guard. He shows "?" and walks to where he heard you.
     Crouch away and watch him look around, give up, and go back to his patrol.
  2. Sight: stand at the far edge of a flashlight and watch the meter at the top fill.
     Step out before it is full and it drains. Stay in and you get "!" and the alarm sting.
  3. Chase: once Alert, run. Both guards come. Get well away, crouch, and climb into the
     laundry cart or stand still in the dark patch in the middle of the room. Watch them
     go to Searching, then Calm.
  4. Search: get chased again, but this time hide in a spot close to where they lost you.
     A guard should come and check it, and pull you out.
  5. Dark spot: stand still in the dark patch while a calm guard sweeps his light over
     you. Nothing. Then take one step while his light is on you.
  6. Knockout: crouch-walk up behind a guard until "SPACE: knock out" appears, and press
     Space. Press Space again on the body to drag it, walk it to the locker or cart, and
     press W to stuff it in. Try to hide in that same spot afterwards (you cannot).
  7. Body found: knock out a guard and leave him on the floor in the other guard's path.
  8. Grab: let an Alert guard reach you. Mash Space to break free, then run. Let them
     catch you a second time: "CAUGHT" and a Restart button (Enter or A also restarts).
  9. All of the above with a controller: X is knock out, drag, and break free.
  10. Playtest question 1 again, now that guards react.
- **Known limits, on purpose:** two guards in the Cell Block is for testing groups; the
  spec's Cell Block has one, and Step 3 goes back to that. Knocked-out guards stay down
  for the whole run. The run cannot be won yet.

## Step 3: Full map, timer, keycard, win and lose

- **Status:** todo
- **Branch:** `step-3-map`
- **Scope:** All 6 areas on 3 floors, connected by doors, hallways, and stairs. Vents stay
  closed. Each area has its guards, cameras, and hiding spots from the spec, on fixed
  patrols. Cameras sweep and send nearby guards to Suspicious. Creaky doors: tap Up is fast
  and loud, hold Up is slow and quiet. The 9:00 headcount timer on screen, pausing only in
  the pause menu. The keycard with all three grab outcomes. Win and lose conditions, the
  score screen, and the four ranks. A map screen that fills in as you explore. Pacing
  target of 30 to 60 seconds per room.
- **Done means:**
  - A full front-door run is playable from bed to keycard and back to bed.
  - Room connections, the timer, keycard outcomes, win and lose, and score and rank math
    are covered by tests.
  - A clean front-door run time is measured and reported.
- **How Adam tests it:** to be written when the task goes to review.

## Step 4: Screwdriver and vents

- **Status:** todo
- **Branch:** `step-4-vents`
- **Scope:** Screwdriver pickup in the Laundry. Vent covers open only with it, and look
  clearly locked before that. Crawl path: Maintenance vent, up the wall, along the duct
  above the Mess Hall, into the Guard Office. Crawling is slow but quiet. Grates to peek
  down through. The one-way vent in the Guard Office that drops into the Cell Block. The
  welded vent in Maintenance with its "Welded shut" message. Vents and the drop appear on
  the map once discovered.
- **Done means:**
  - Vent locks, crawl paths, and the one-way drop are covered by tests.
  - A clean vent run time is measured and compared with the front-door run.
- **How Adam tests it:** to be written when the task goes to review.

## Step 5: Inmates, bed check, dummy, camera panel

- **Status:** todo
- **Branch:** `step-5-inmates`
- **Scope:** Snitch inmates in the Cell Block with small vision cones; seen means they
  yell and the nearest guard goes Suspicious to that spot; with the keycard you can open
  their cell and knock them out. The trader inmate, who swaps the Mess Hall cigarettes for
  a hint about whichever of the vents, camera panel, or one-way drop you have not found.
  The bed check at 5:00 remaining. Bedsheets in the Laundry, the dummy, and placing it in
  your bed. The Maintenance camera panel that turns off the Stairwell camera.
- **Done means:** each of those systems works as the spec says and has tests.
- **How Adam tests it:** to be written when the task goes to review.

## Step 6: Polish, ready to share

- **Status:** todo
- **Branch:** `step-6-polish`
- **Scope:** Title screen with Start and Controls. Controls screen for keyboard and
  controller. First-time tutorial hints (hide, crouch, knockout, vent). Sound effects:
  footsteps, door creaks, alert sting, timer warning at 1:00. Pause menu with Restart and
  Controls. Runs smoothly on a 2015 MacBook Air with Intel graphics. A playtest page or
  text at the end asking the four playtest questions. README updated.
- **Done means:** a friend can open the link, learn the game, finish a run, and send
  feedback without help from Adam.
- **How Adam tests it:** to be written when the task goes to review.

---

## Playtest questions (ask Adam after each build)

1. Did hiding while a guard walked by feel tense?
2. Did the timer feel exciting, or just stressful?
3. Did the vent shortcut feel like a reward?
4. Did you want to play again to do it faster or cleaner?

## Open questions about the spec

Each one lists the assumption the build uses until Adam says otherwise.

1. **"Getting spotted costs time."** Is that only the time you lose hiding and waiting, or
   should being spotted also take seconds off the timer? Assumed: no direct penalty.
2. **Map versus area notes.** The map draws a vent from the Mess Hall down to Maintenance
   and a vent from the Vent Duct down to the Cell Block. The route text says the vent runs
   from Maintenance up the wall to the duct above the Mess Hall, and the Cell Block's only
   vent is the exit of the one-way drop from the Guard Office. Assumed: the route text is
   right, and the duct has no opening into the Mess Hall or Cell Block other than grates
   you can peek through.
3. **Stairs to the Guard Office.** The map shows stairs straight down from the Guard Office
   next to the Stairwell. Assumed: those are the Stairwell Checkpoint's stairs, so the
   office has exactly two ways in (stairwell door, duct) and one extra way out (the drop).
4. **Bed check versus the win.** If the bed check goes Alert because the bed was empty, is
   the run still winnable by getting back in bed? Assumed: yes, guards chase as in any Alert.
5. **Sleep action and the dummy.** If the dummy is in the bed, do you have to remove it
   before you can get in? Assumed: getting in bed swaps you for the dummy automatically.
6. **Break free button.** Space / X is both knockout and break free. Assumed fine, since you
   cannot do both at once.
7. **Camera with no guards nearby.** Maintenance has a camera but no guards. Assumed: its
   alert reaches the Laundry guard next door.
