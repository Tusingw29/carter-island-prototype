# Carter Island: task board

One task per build step. The spec is in [DESIGN.md](DESIGN.md). The steps are Adam's.

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
| 3 | Full map, timer, keycard, win and lose | review, awaiting Adam's verdict | `step-3-map` |
| 4 | Screwdriver and vents | review, awaiting Adam's verdict | `step-4-vents` |
| 5 | Inmates, bed check, dummy, camera panel | review, awaiting Adam's verdict | `step-5-inmates` |
| 6 | Polish, ready to share | review, awaiting Adam's verdict | `step-6-polish` |
| 7 | Playtest 1: camera options, timer cues, silent alarm made clear | review, awaiting Adam's verdict | `step-7-playtest-1` |
| 8 | Playtest 2: smart camera, hit feedback, knockout rules, 7:00 timer, gym | review, awaiting Adam's verdict | `step-8-playtest-2` |
| 9 | Playtest 3: chase instead of instant capture, instant knockouts, gym feel | review, awaiting Adam's verdict | `step-9-playtest-3` |
| 10 | Playtest 4: cover blocks sight, picture quality, gym values, shove, throwables | review, awaiting Adam's verdict | `step-10-playtest-4` |
| 11 | The Yard: jump and slide everywhere, dash unlock, towers, searchlights, roof route | review, awaiting Adam's verdict | `step-11-yard` |
| 12 | Playtest 5: searchlight and crate bugs, quieter sneaking, takedown system | review, awaiting Adam's verdict | `step-12-takedowns` |
| 13 | Readable stealth: lit or hidden look, last-seen markers, solitary | review, awaiting Adam's verdict | `step-13-readable-stealth` |
| 14 | Heat-up detection, spotted counts, clearer takedown menu, places to drop from | review, awaiting Adam's verdict | `step-14-heat-up` |
| 15 | Review fixes: door escalation (heat), drawings match checks, hiding tell, slides, and more | review, awaiting Adam's verdict | `step-15-review-fixes` |

**Later** (cards from [the outside review](reviews/codex-review-1.md) that Adam saved for later):

| Review card | Task | Status |
| --- | --- | --- |
| 7 | Apply height-aware interaction reach to the keycard, panel, cells, and pickups (review R10) | later |
| 11 | Profile the target MacBook Air and share light-shape work between detection and drawing (review R13) | later |
| 12 | Define a save schema and vertical navigation contracts before adding saving or a grapple (review R12) | later |

Review card 9 (verify recovery with an earned keycard) was neither approved nor saved for
later in Prompt 15. It is not on the board.

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

- **Status:** review, awaiting Adam's verdict
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
- **Measured:** a planning bot with perfect timing does a clean front-door round trip
  (Ghost rank, slow keycard grab, nobody Suspicious at any point) in **2:14**. That run is
  a test (`tests/clean-run.test.mjs`), so the level is proven beatable on every change.
  Bot time per room: Cell Block 10 s, Mess Hall 22 s, Stairwell 30 s, Guard Office 9 s.
  A person reading patrols for the first time will be two to three times slower, which
  lands most rooms in the 30 to 60 second target. The Cell Block and Guard Office are quick.
- **How the new rules work:**
  - You start in bed. Up gets you out. The run ends at 0:00, or when you press E in bed
    with the keycard.
  - Hall archways at the ends of rooms are dark. You arrive unseen and can watch the room
    before you move. Stand still and you stay hidden.
  - Mess Hall tables, the office desk, and the Stairwell counter are wide hiding spots.
    Once under or behind one you can crawl along it, silently, and come out the other end.
    The counter is how you get past the standing guard, who turns every 5 seconds.
  - Cameras show the stretch of floor they watch in blue. Stand still in the shadow under
    the stairs to let the Stairwell camera pass over you.
  - Guards do not follow you out of a room. They search near the way you left, and the
    guards in the room you ran into come to look.
  - Keycard: hold E for 2 seconds and nothing happens. Tap E and the guard stirs; be out
    of the room within 4 seconds or he wakes up Alert. If a camera has seen you at any
    point in the run, or the office guard is knocked out, taking the card sets off the
    silent alarm: every guard shows "?" for the rest of the run, walks faster, and notices
    you sooner.
- **How Adam tests it:**
  1. Front door run: bed, right through the Cell Block, Mess Hall, Stairwell, hold Up on
     the rust-colored door, hold E on the keycard, and back the same way. Get in bed and
     press E. Check the score screen and rank.
  2. Time each room with the on-screen timer. Tell me which felt too short or too long.
  3. Creaky door: at the office door, tap Up instead of holding. Watch the sleeping guard
     stir (he shows a countdown). Try the Laundry door too, with the guard nearby.
  4. Keycard outcomes: one run with hold E, one with tap E and running out, one with tap E
     and staying, one after walking in front of the Stairwell camera first.
  5. Camera: walk into the blue beam in the Stairwell and watch the guard come.
  6. Map: press M in a few rooms. Rooms appear as you enter them, and rooms you have seen
     a way into show as "?".
  7. Pause: press Esc. The timer stops. It stops nowhere else.
  8. Lose both ways: get grabbed twice, and stand out of bed at 0:00. To skip the wait,
     turn on debug (F1) and press [ to take 30 seconds off the timer.
  9. Ranks: Ghost (never spotted, no knockouts), Shadow (knock someone out, never spotted),
     Inmate (get spotted, still make it back).
  10. Playtest questions 2 and 4.
- **Shortcuts for testing:** add `?room=stairwell&px=2` to the link to start in a room,
  `?timer=30` to start with 30 seconds left, `?debug` to start in debug mode. Room ids:
  `cell-block`, `laundry`, `maintenance`, `mess-hall`, `stairwell`, `guard-office`.
- **Known limits, on purpose:** the Laundry and Maintenance Hall are open but there is
  nothing to collect there yet. Vents, screwdriver, snitches, trader, bed check, and the
  camera panel come in Steps 4 and 5. The way home is the way you came until Step 4.

## Step 4: Screwdriver and vents

- **Status:** review, awaiting Adam's verdict
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
- **Measured (planning bot, perfect timing, Ghost rank, all three are tests):**

  | Route | Clean run |
  | --- | --- |
  | Front door in, front door back | 2:14 |
  | Front door in, one-way drop home | 1:36 |
  | Vent route: Laundry, Maintenance, duct, drop home | 1:17 |

  The vent route is 57 seconds faster than walking the front door both ways and 19 seconds
  faster than front door plus the drop, even with the trip to fetch the screwdriver. It
  also never enters the Mess Hall or Stairwell, so it passes 1 awake guard and 1 camera
  instead of 4 awake guards and 1 camera. Expect people to be two to three times slower
  than the bot on every route.
- **How the new rules work:**
  - Vent covers with amber screws are screwed shut. Walk up to one and it goes on your
    map, even if you cannot open it yet. With the screwdriver the screws turn blue.
  - In the duct you can only crawl (crouch speed), and it makes no noise.
  - Standing on a grate shows a strip at the bottom of the screen: the room below, with
    live guard positions and which way they face.
  - The duct drops you into the Guard Office through the ceiling. You cannot climb back up.
  - The floor vent in the Guard Office opens without a tool, from inside only, and drops
    you into the dark archway at the east end of the Cell Block.
  - The welded vent in Maintenance has an orange weld around it and never opens.
- **How Adam tests it:**
  1. Before getting the screwdriver, go down to the Laundry, through the creaky door to
     Maintenance, and try both vents (the amber-screwed one and the welded one). Open the
     map and check the vent has appeared.
  2. Take the screwdriver in the Laundry (E, on the crate past the guard's patrol). Go
     back and open the vent.
  3. Crawl the duct. Stop on each grate and watch the guards below. Try to run (you cannot).
  4. Drop into the Guard Office. Try to climb back up. Take the keycard.
  5. Use the floor vent to drop home. In the Cell Block, try to open that vent from below.
  6. Do one full vent run and one full front-door run and compare how they feel and how
     long they take you.
  7. Front-door players: check you can still use the drop home with no screwdriver.
  8. Playtest question 3: did the vent shortcut feel like a reward?
- **Known limits, on purpose:** the camera panel in Maintenance arrives in Step 5.

## Step 5: Inmates, bed check, dummy, camera panel

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-5-inmates`
- **Scope:** Snitch inmates in the Cell Block with small vision cones; seen means they
  yell and the nearest guard goes Suspicious to that spot; with the keycard you can open
  their cell and knock them out. The trader inmate, who swaps the Mess Hall cigarettes for
  a hint about whichever of the vents, camera panel, or one-way drop you have not found.
  The bed check at 5:00 remaining. Bedsheets in the Laundry, the dummy, and placing it in
  your bed. The Maintenance camera panel that turns off the Stairwell camera.
- **Done means:** each of those systems works as the spec says and has tests.
- **Measured:** with snitches in the Cell Block the clean bot runs are: front door both
  ways 2:14, front door plus drop 1:36, vent route 1:23. All three are still Ghost runs.
- **How the new rules work:**
  - Two snitches (purple caps) are in cells in the Cell Block. Each watches a short purple
    stretch of floor on one side of his cell for 4 seconds, then the other side. Right at
    his bars is a blind spot: stand there and wait for him to look the other way.
  - If a snitch sees you he yells, and the nearest guard comes to that spot. It counts as
    being spotted.
  - With the keycard: stand at his bars, Up opens the cell (the lamp turns green), Space
    knocks him out. It counts as a knockout.
  - The trader (green cap) is in the cell next to your bed. E talks to him. The cigarettes
    are on a crate at the far east end of the Mess Hall. He gives one hint per run, about
    the first of these you have not found: the vents, the camera panel, the one-way drop.
    The hint is kept on the map screen, and vents he mentions are added to the map.
  - Under the timer it says "bed check at 5:00". At 5:00 left the Cell Block guard walks
    to your bed and looks. You in bed, or the dummy in bed: he goes back to his patrol.
    Empty: every guard in the prison goes Alert, hunts around where he stands, and stays
    on edge ("?") for the rest of the run. You can still get home and win.
  - Bedsheets are on a crate near the Laundry stairs. Stand by your bed and press E to
    make the dummy. Getting into bed yourself still works with the dummy there.
  - The camera panel is on the wall in Maintenance between the two vents. E switches the
    Stairwell camera off (its light goes red), and E again switches it back on.
- **How Adam tests it:**
  1. Leave your bed and walk right. Let the first snitch see you. Watch the guard come.
  2. Next run, sneak past both snitches using the blind spot at the bars.
  3. Talk to the trader with nothing. Then fetch the cigarettes from the Mess Hall, come
     back, and trade. Open the map and read the note. Do it again on a run where you have
     already been to the Maintenance vent, and check the hint is a different one.
  4. Be out of your cell at 5:00 with no dummy. (Debug mode, then [ takes 30 seconds off
     the timer so you do not have to wait four minutes.)
  5. Next run: get the bedsheets, make the dummy, leave, and be out at 5:00. Go back and
     look at your bed during the check if you can do it unseen.
  6. Stay in bed through the check on another run.
  7. Use the panel in Maintenance, then walk through the Stairwell camera's stretch.
  8. Get the keycard, come home by the drop, open a snitch's cell, and knock him out.
  9. Playtest questions 2 and 4.
- **Known limits, on purpose:** if the Cell Block guard is knocked out there is no bed
  check. Knocked-out snitches are never found by guards.

## Step 6: Polish, ready to share

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-6-polish`
- **Scope:** Title screen with Start and Controls. Controls screen for keyboard and
  controller. First-time tutorial hints (hide, crouch, knockout, vent). Sound effects:
  footsteps, door creaks, alert sting, timer warning at 1:00. Pause menu with Restart and
  Controls. Runs smoothly on a 2015 MacBook Air with Intel graphics. A playtest page or
  text at the end asking the four playtest questions. README updated.
- **Done means:** a friend can open the link, learn the game, finish a run, and send
  feedback without help from Adam.
- **What was built:**
  - Title screen: "Carter Island (prototype)", Start, Controls. Enter or A starts.
  - Controls screen with keyboard and controller side by side. C or Y opens it any time.
  - Hints, each shown once per browser: the goal (in bed at the start), crouch, hide,
    dark patches, knockout, creaky doors, vents. "Show the tutorial hints again" is on the
    Controls screen.
  - Sounds: footsteps for walking and running (none when crouched), a creak while easing
    a door open and a bang when you slam it, the alert sting, three beeps at 1:00, and a
    tick for each of the last ten seconds. All made in code, no sound files.
  - Pause menu: Resume, Restart run, Controls, Quit to title.
  - "Tell Adam what you thought" on the score screen opens the four playtest questions.
    "Copy my answers" puts the answers and the run's score on the clipboard to paste
    into a message. There is no server, so nothing is sent anywhere by the game.
  - Speed: no shadows or post-effects; edge smoothing off on high-density screens;
    on-screen text only updates when it changes; and if frames stay slow for two seconds
    the picture drops to 75%, then 55% resolution. Debug mode shows the frame rate.
- **Not verified:** I could not run it on a 2015 MacBook Air. It was checked in headless
  Chrome with software rendering only. Step 1 of the test list below is the real check.
- **How Adam tests it:**
  1. On the MacBook Air, open the link, press F1, and read the "speed" line while walking
     through the Mess Hall (the busiest room). It should stay near 60 fps at 100%. If it
     drops to 75% or 55%, tell me which room. `?low` on the link forces the lowest setting.
  2. From the title screen, open Controls with C, go back, and start with Enter. Repeat
     with a controller (Y, B or Start, A).
  3. Play the first minute as if you had never seen it. Do the hints appear at the right
     moments, and do they say enough?
  4. Listen: walk, run, crouch. Hold Up on a rust-colored door, then tap one.
  5. In debug mode press [ until the timer is just over 1:00 and listen for the warning.
  6. Pause with Esc. Try Restart, Controls, and Quit to title.
  7. Finish a run, press "Tell Adam what you thought", fill it in, press Copy, and paste
     it somewhere to check it reads well.
  8. Send the link to one friend and watch them play without helping.
  9. All four playtest questions. This is the "is the core loop fun?" verdict.

---

## Step 7: Playtest 1 (camera options, timer cues, silent alarm made clear)

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-7-playtest-1`
- **Playtest 1 results (Adam):** hiding while a guard walked by felt tense, and it is
  "pretty hard in a good way": keep both. Found the screwdriver, used the vents (felt like a
  reward), got the keycard. Caught on every route home (Caught, 6:17 left, spotted 2,
  knockouts 3, bodies found 0). Did not notice the timer. Wants a wider camera.
- **Not changed, on purpose:** guard detection, speeds, patrols, the 9:00 timer, and what
  the silent alarm does to guards. Nothing in this step makes the game easier or harder.
- **Done means:**
  - Four camera modes behind `?cam=`, a zoom key, and the mode shown in the pause menu.
  - PA announcements, wall clocks, and a last-minute tick, on by default, off with `?cues=off`.
  - The silent alarm says that it fired and why, on screen, by sound, and on the score screen.
  - The return-trip check below is reported.
  - Tests for the camera bounds, the PA cue times, the silent alarm reason, and the new
    score screen fields.

### The four camera links

| Link | Camera |
| --- | --- |
| https://tusingw29.github.io/carter-island-prototype/?cam=close | The camera from before. Still the default. |
| https://tusingw29.github.io/carter-island-prototype/?cam=wide | Same follow camera, twice as far back, twice as much floor. |
| https://tusingw29.github.io/carter-island-prototype/?cam=room | Whole room if it fits. If not, follows you and stops at the walls. |
| https://tusingw29.github.io/carter-island-prototype/?cam=smart | Wide while moving. Closes in when you hide, are grabbed, or a guard is within 4.5 m. |

- **Z** (or **Left Bumper**) switches between close and wide in any mode. In smart mode it
  goes smart, held close, held wide, and back to smart. A note in the bottom left corner
  says what it switched to, and the pause menu always shows the camera in use.
- Room mode on a 16:9 screen: the Stairwell, Guard Office, Laundry, Maintenance Hall, Cell
  Block, and Vent Duct are shown whole. Only the Mess Hall (38 m) scrolls. On entering a
  room the camera starts a little closer and eases out.
- Guard "?" and "!" icons and the action prompts are the same size on screen at every zoom,
  so they are larger next to the guards when zoomed out. Flashlight and camera beams are
  drawn 60% stronger when the camera is fully pulled back.
- Choices I made: wide and smart show black above and below the room, because the rooms
  are only 4.6 m tall. In smart mode, standing still in a dark patch does not close the
  camera in (only lockers, carts, tables and so on do), because the dark archways are where
  you stand to read a room and that is when you want the wide view.

### Timer cues

- PA announcements: a two-tone chime and a banner under the alert meter, for 5 seconds.
  "Bed check" at 5:08 left, "Headcount in 5 minutes" at 5:00, "Headcount in 2 minutes" at
  2:00, "Headcount in 1 minute" at 1:00. The on-screen timer glows while the PA is talking.
- A clock showing the time left hangs on the back wall of every room, close enough together
  that one is always on screen with the close camera. The Vent Duct has small ones.
- Last minute: a tick every second from 1:00, twice a second from 0:30, four times a second
  from 0:10. The on-screen timer pulses once a second and the wall clocks turn red and flash.
- `?cues=off` removes all of it and gives back the Step 6 timer (three beeps at 1:00 and a
  tick for each of the last ten seconds), so the two can be compared.

### Silent alarm

- When it fires: a long message, "SILENT ALARM: a camera saw you earlier in the Stairwell
  Checkpoint. Every guard is on edge now." (or "the office guard was knocked out", or
  both), and its own sound: three low pulses and a drone.
- A red "SILENT ALARM" tag sits under the alert meter for the rest of the run.
- Score screen, three new rows: Keycard (Taken slowly / Grabbed fast / Not taken), Silent
  alarm (No, or Yes and why), and Caught in (the room). A headcount loss shows "Out of bed
  in" instead. The same lines are in the text the playtest form copies.

### "Why was the way home so hard?" (planning bot, no gameplay changed)

The bot takes the keycard slowly, then goes home without ever being seen or heard. "Alarm
on" means a camera saw it earlier, so the grab sets off the silent alarm. The alarm makes
guards walk faster from the moment of the grab, so how their patrols line up afterwards
depends on when you grab. Each cell is therefore a range over 35 different grab moments
(18 for the vents rows), from keycard in hand to asleep in bed.

| Way in | Way home | Alarm off | Alarm on |
| --- | --- | --- | --- |
| Front door | Front door | possible, 51 to 68 s (typical 59) | possible, 77 to 98 s (typical 90) |
| Front door | One-way drop | possible, 21 to 59 s (typical 51) | possible, 31 to 54 s (typical 41) |
| Vents | Front door | possible, 63 to 80 s (typical 72) | possible, 69 to 89 s (typical 78) |
| Vents | One-way drop | possible, 22 to 34 s (typical 28) | possible, 26 to 81 s (typical 35) |
| Any | Vents | not a way home | not a way home |

- **Every way home is still possible with the silent alarm on.** No tuning change is needed
  to make one possible, so none is suggested for that.
- The vents are not a way home by design: the duct drops you into the office through the
  ceiling and you cannot climb back up. Vent players go home by the drop or the front door.
- The alarm costs 6 to 30 seconds on the front door (mostly waiting in the Mess Hall) and
  very little on the drop, except at unlucky grab moments, when the Cell Block alone takes
  over a minute of waiting.
- What the bot shows about why it is hard, alarm or not:
  1. Every way home ends with the same 24 m of the Cell Block, from the east end to your
     bed: past snitch 2, the guard's whole patrol, and snitch 1. A player who went out by
     the stairs next to the bed has never crossed it, and meets it for the first time with
     the keycard in hand.
  2. The drop lands you at 28.6 m, which is exactly the far edge of what snitch 2 can see
     when he looks east. You are hidden there only while you stand still in the dark. Step
     off while he is looking your way and he yells.
  3. The Cell Block has almost no slack. The bot keeps 0.3 m clear of every beam. Ask it to
     keep 0.7 m clear and it cannot get from the east end to the bed at all, with the alarm
     on or off (5 grab moments tried). The likely cause is the snitch blind spot, which
     is only 0.6 m wide.
  4. With the alarm on, guards walk 2.2 m/s instead of 1.5 and fill their sight meter 1.5
     times faster: full Alert at the far edge of a beam in 0.9 s instead of 1.3 s.
- Adam's run very probably had the alarm on. The vent route crosses the Maintenance camera,
  and a camera seeing you is one of the two triggers; the other is knocking out the office
  guard, and the run had 3 knockouts. The new score screen rows will say for certain.
- **Limits of this check:** the bot has perfect timing and knows every patrol in advance.
  "Possible" means possible for it. It does not measure how hard a route is for a person.
- **If Adam wants the way home less punishing (suggestions only, nothing applied):**
  - Smallest: move the drop's landing spot (`cb-drop` x in `rooms.js`) from 28.6 to 29.2,
    so you can take a step in the dark before snitch 2 can see you.
  - Next: make the snitch blind spot a little wider (`snitch.blindSpot` 0.6 to 0.9).
  - Or: have the silent alarm keep "notices sooner" but drop "walks faster" (patrol speed
    when wary, in `guard.js`), which removes the long waits at unlucky grab moments.

### How Adam tests it

1. Open each of the four camera links and play the first two rooms with each. Press Z to
   flip between close and wide. Tell me which one becomes the default.
2. With `?cam=room`, walk from the Cell Block into the Mess Hall and on into the Stairwell.
   Check you never see past a room's end walls, and that the ease-in on entering feels right.
3. With `?cam=smart`, hide in a locker, then come out and walk. Let a guard walk up to you.
4. Zoomed out, check you can still read the guards' beams, the "?" and "!", and the prompts.
5. Press Esc and read the camera line in the pause menu.
6. Timer: play normally and notice (or not) the wall clocks. To hear the PA without waiting,
   use `?timer=312` (Bed check, then 5 minutes), `?timer=123`, and `?timer=63`. Stay with
   the last one for the ticking, the pulse, and the red clocks. Then try `?cues=off`.
7. Silent alarm: walk through the blue camera beam in the Stairwell, then take the keycard.
   Or use `?alarm&room=guard-office&px=8`, which acts as if a camera already saw you. Check
   the message, the sound, and the red tag. Then get caught and read the score screen.
8. Do the same after knocking out the office guard (no camera) and check the reason changes.
9. Try the way home again, by the drop and by the front door. After the drop, stand still
   and watch snitch 2 (the purple stretch of floor) before you take a step.
10. Playtest question 2 again: did the timer feel exciting, or just stressful?

---

## Step 8: Playtest 2 (smart camera, hit feedback, knockout rules, 7:00 timer, gym)

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-8-playtest-2`
- **Playtest 2 results (Adam):** won. Inmate, 4:57 left, spotted 7, knockouts 8, bodies
  found 0, keycard grabbed fast, silent alarm from knocking out the office guard. Dozens of
  reruns to learn it, then "with ease". Hiding tension fell to "somewhat" because knocking
  out every guard is the easiest way to win: they stay down and nobody misses them. Timer
  only stressful when the alarm sounded. Vents a reward. Picked the smart camera. Wants hit
  feedback, and Mega Man X movement over time.
- **Not changed, on purpose:** guard vision, detection speed, patrols, chase speed, and the
  main map. The new moves exist only in the gym.
- **Links:**
  - Main game: https://tusingw29.github.io/carter-island-prototype/
  - Gym: https://tusingw29.github.io/carter-island-prototype/?room=gym

### What was built

1. **Camera:** smart is the default. `?cam=close`, `?cam=wide`, and `?cam=room` still work.
2. **Hit feedback:** when a knockout lands the game freezes for 80 ms, the guard flashes
   white, the picture shakes for a quarter of a second, there is a thud, and the controller
   rumbles if the browser supports it. The guard then topples over (0.28 s) and shows "Zz".
3. **Knockout rules** (all numbers in `config.js`, under `knockout` and `radio`):
   - **A. Guards wake up** after 75 seconds. A guard on the floor starts to stir 6 seconds
     before ("Zz...?" and a message naming the room). A guard in a locker or cart bangs on
     it for 4 seconds first ("BANG! BANG!", a message, and every guard within 10 m in that
     room walks over), then climbs out. Either way he searches around where he woke up and
     shows "?" for the rest of the run. In debug mode a knocked-out guard shows a wake-up
     meter and the seconds left.
   - **B. Radio check-ins.** The five patrolling guards call in once a minute, 8 seconds
     apart, starting at 0:20 into the run: Cell Block, Laundry, Mess Hall 1, Mess Hall 2,
     Stairwell. A guard checking in shows "((•)) check-in" and makes two blips. If a guard
     is knocked out when his turn comes, the screen shows
     `Radio: "No answer from the Laundry guard... Cell Block guard, go and check."` and the
     nearest awake guard in his room walks to his post. **The cross-room version is in:**
     if nobody else is in that room, the guard with the shortest walk from a room next
     door comes through the hall, door, or stairs, looks around, and walks home. If he sees
     the body on the floor he raises the alarm, even if you are not in the room
     (`Radio: "Man down in the Laundry!"`). A missed check-in repeats every minute until
     the guard wakes.
   - **C. Choke hold.** Hold Space / X for 1.5 seconds behind an awake guard. He thrashes,
     you cannot move, and it is heard 1.5 m away (walking is 2.5 m). Let go early and he
     breaks free, turns round, and the alarm goes up. Sleeping guards and snitches in an
     open cell still go down with a tap.
4. **Timer:** 7:00. Bed check at 3:30. PA: "Headcount in 5 minutes" at 5:00, "Bed check" at
   3:38, "Headcount in 2 minutes", "Headcount in 1 minute".
5. **Gym** (`?room=gym`): one long room, no timer, not connected to the prison. From left to
   right: two crates as steps up to a ledge that runs over the first guard's patrol; a wall
   with a 0.75 m gap under it; a dark patch; a 6 m gap in the floor; the second guard; two
   more crates. Fall in the gap and you are put back on the edge.
   - **Jump** (K, controller B): 1.29 m high, about half a second in the air, falls faster
     than it rises, and letting go early cuts it short. Landing is heard 1.5 m away.
   - **Slide** (S + K while moving, controller Down + B): 3.15 m at 7 m/s, 0.6 m tall,
     heard 1 m away. The low gap is too low to crouch under. A slide that would end under
     it keeps going until there is room to get up.
   - **Dash** (L, controller Right Bumper): 3.5 m in a quarter of a second, heard 11 m
     away (running is 8 m). In the air it holds its height, once per jump.
   - Jumping out of a ground dash keeps the dash speed for the whole jump, as in Mega Man X.
   - The gap needs a dash: a running jump covers about 3.6 m. Jump then air dash clears it,
     and so does a dash-jump.

### Planning bot, 7:00 timer and new knockout rules

| Route | Clean run still possible | Time | Rank |
| --- | --- | --- | --- |
| Front door in, front door back | yes | 2:14 | Ghost |
| Front door in, one-way drop home | yes | 1:36 | Ghost |
| Vent route: Laundry, Maintenance, duct, drop home | yes | 1:23 | Ghost |
| Way home by the front door, silent alarm on | yes | 77 s from the keycard | |
| Way home by the drop, silent alarm on | yes | 36 s from the keycard | |

- The times are the same as before. A clean run knocks nobody out, so the new knockout
  rules never come into it, and guard patrols were not touched. All three finish long
  before the 3:30 bed check (which now falls at 3:30 into the run).
- **Limit:** the bot only plans clean runs. It does not play the "knock everyone out"
  style, so it cannot say how much harder that style is now. That is for Adam's hands.

### Choices I made that Adam should check

- The sleeping office guard is not on the radio, so knocking him out is never reported.
  It still sets off the silent alarm when you take the keycard.
- Hit-stop freezes the whole game, timer included, for 80 ms per knockout.
- If the Cell Block guard is next door on a radio check at 3:30, the bed check waits until
  he is home.
- A guard on a radio check who gets into a chase in the other room stays there until he
  has calmed down, then walks home. Guards still never follow you between rooms.
- Knocked-out snitches do not wake up.
- In the gym, guards stay on their own stretch of floor, even when chasing, so they never
  walk through a crate or over the gap. A guard cannot grab you if your feet are more than
  1.2 m above him.
- **Not verified:** the sounds are unheard, rumble is untested on a real controller, and it
  has not been run on the 2015 MacBook Air. Checked by tests and headless Chrome only.

### How Adam tests it

1. Main game. Get behind the Cell Block guard, hold Space until he drops. Watch the freeze,
   flash, shake, and fall, and listen for the thud. Then do it again and let go early.
2. Leave him on the floor and walk off. About 20 seconds into the run he misses his
   check-in: read the radio line and watch who comes. Hide and see what he does at the body.
3. Next run, stuff the body in the locker. The radio still sends someone, who finds
   nothing. Wait for 75 seconds and listen for the banging.
4. Turn on debug (F1) to see the wake-up meter over a knocked-out guard.
5. Try the "knock everyone out" run again. Tell me if it is still the easiest way to win.
6. Timer: does 7:00 feel different? Is the 3:30 bed check in a good place?
7. Gym: jump onto the crates and the ledge, and walk over the guard's head. Slide under the
   wall. Cross the gap two ways (jump then L in the air, or L then K on the ground).
8. In the gym, dash near a guard and watch him react, then slide past the same guard.
9. Tell me which numbers feel wrong: jump height, fall speed, dash length, slide length.
10. All four playtest questions.

---

## Step 9: Playtest 3 (chase instead of instant capture, instant knockouts, gym feel)

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-9-playtest-3`
- **Playtest 3 results (Adam):** caught in the Mess Hall with 6:13 left, about 47 seconds
  in. Spotted 5, knockouts 1, no keycard. "The guard on the main version now is like
  instantly caught." Wants a chase: "They can see me, but they've got to catch me." Wants
  the instant knockout from behind back. Likes the run speed. The gym was confusing and
  the movement still a little stiff.
- **Not changed:** vision cone sizes, patrols, the player's speeds, the wake-up timer, the
  radio check-ins, the one break-free chance, and the main map.
- **Links:**
  - Main game: https://tusingw29.github.io/carter-island-prototype/
  - Gym: https://tusingw29.github.io/carter-island-prototype/?room=gym

### Why it felt instant (measured on the Step 8 rules, before anything was changed)

Scripted runs in the Mess Hall with both guards. Times are seconds after the guard first
saw the player. This is not a replay of Adam's actual run, which was not recorded.

| What the player did | "?" | "!" | Grab | "!" to grab |
| --- | --- | --- | --- | --- |
| Stepped in front of a guard, 1 m away | 0.08 | 0.22 | 0.22 | 0.0 s |
| Let go of a choke hold early | | 0.00 | 0.00 | 0.0 s |
| Was seen up close and ran from him, toward the other guard | 0.00 | 0.20 | 2.18 | 2.0 s |
| Stood at the far edge of a beam, 6.5 m away | 0.36 | 0.87 | 1.77 | 0.9 s |
| Was seen far off and ran, toward the other guard | 0.00 | 2.39 | 2.54 | 0.15 s |
| Broke free of the first grab and ran into the Cell Block | | | caught about 2 s after breaking free | |

Which rule caused each step:

1. **Close-up sight.** Within 1.2 m in front of a guard you are seen even below his beam,
   and within 2 m the meter fills in 0.3 s. So "!" came 0.2 s after stepping in front.
2. **Grab on contact.** A grab needed no wind-up, only being within 0.8 m of an Alert guard.
   At 1 m he was already there, so the "!" and the grab were the same instant. This is the
   main cause of "seen is the same as caught".
3. **The choke hold.** Letting go early made him Alert at arm's length: Alert and grabbed
   in the same instant. With one knockout in the run, a failed hold is a likely part of it.
4. **The alarm reaches the whole room.** Both Mess Hall guards went Alert together, one on
   each side. Running from one meant running at the other, who grabbed 0.15 s after "!".
5. **The radio check-in.** With the Cell Block guard knocked out, his missed check-in 20
   seconds into the run sends Mess Hall guard 1 walking toward the Cell Block, which puts a
   Suspicious guard in the doorway about when Adam got there. Likely, not certain.
6. **The second grab ends the run.** After breaking free, the next room's guards are told
   where you came in, and the next contact was the end, with no mash.

Chase speed was not the cause: it was already 77% of the run speed.

### What was built

1. **Seen is not caught.**
   - **Reaction:** a guard who goes Alert freezes for 0.6 s with a big "!" and the sting.
   - **Chase speed:** 5.2 m/s, 80% of your run (6.5) and faster than your walk (3.2).
   - **Lunge:** a grab is now a lunge. It starts when he is within 1.2 m, takes 0.35 s to
     wind up (he crouches, his beam flashes white, "!!" over his head), then carries him up
     to 1.8 m forward. Run during the wind-up and he misses. Run past him and he lunges at
     nothing. Walking is not fast enough. A miss leaves him stumbling for 0.9 s.
   - **Losing him:** out of his sight for 2 seconds and he goes to Searching around the
     last place he knew you were. A hiding spot he did not see you get into still works.
     One he watched you get into does not: he walks up and pulls you out, with no lunge.
   - The same scripted tests now: stepping in front of a guard at 1 m gives "!" at 0.22 s
     and the grab at 1.17 s if you stand still, and no grab in that room if you run.
2. **Knockouts are instant again** from behind when he has not seen you, with the Step 8
   hit feedback. The choke hold is gone. On a guard who is facing you, can see you, or is
   already Alert, Space does nothing but show a red shaking "TOO RISKY" for 0.6 s.
3. **"How you got caught"** on the score screen and in the playtest text, for example:
   `Grabbed 1.0 s after the "!". The Mess Hall guard 1 saw you up close.` The causes it can
   name: seen up close, seen in a flashlight, watched getting into a hiding spot, found in
   a hiding spot during a search, a body found, the sleeping guard waking, the empty bed.
4. **Gym as an obstacle course** with a sign over each part: 1. JUMP, 2. HOLD JUMP TO GO
   HIGHER, 3. SLIDE, 4. DASH, 5. AIR DASH, 6. SNEAK PAST THE GUARD, FINISH. The clock at the
   top right starts when you first move and stops at the finish line, with your best time
   under it. E (or A) past the line runs it again.
5. **Gym movement feel:** instant start and stop; tap for a hop, hold for the full jump;
   falling faster than rising, and faster again while holding down; instant turns in the
   air; coyote time 0.1 s; jump buffering 0.1 s; dash at one speed for one distance with a
   dead stop; a dash jump by jumping out of a dash or by holding dash while you jump; one
   air dash per jump, dead level; stretch on take-off, squash on landing, a dust puff
   where a dash starts.
6. **Tuning sliders** in the gym with F1: jump height, gravity, fall speed, dash speed,
   dash distance. They change the game at once. "Copy values" gives text to paste into
   the `moves` section of `config.js`. Nothing is saved: a reload goes back to config.js.

### Planning bot, new chase rules

| Route | Clean run | Time |
| --- | --- | --- |
| Front door in, front door back | yes, Ghost | 2:14 |
| Front door in, one-way drop home | yes, Ghost | 1:36 |
| Vent route | yes, Ghost | 1:23 |

Unchanged, because a clean run is never seen, so no chase ever starts. The bot cannot
judge how the chase feels. That is the point of this playtest.

### Choices I made that Adam should check

- A walking player is still caught by a lunge. Only running (or getting past him) dodges it.
- Every guard the alarm reaches gets the 0.6 s pause, not only the one who saw you.
- The 2-second rule is per guard. A guard who never saw you runs to where you were
  reported for 2 seconds, then searches.
- A guard still knows where you are for 1 second after losing sight (as before), so a
  hiding spot only works if you were out of his sight for more than a second first.
- In the gym you still walk by default and hold Shift to run, as in the main game, so the
  sneaking part works the same way. If the stiffness is the walk speed, say so.
- The gym now has one guard (the sneak section), not two.
- **Not verified:** not played by a person, sounds unheard, rumble and the 2015 MacBook
  Air untested. Checked by tests, scripted runs, and headless Chrome.

### How Adam tests it

1. Main game. Walk into a guard's flashlight. Watch for the big "!" and the freeze, then
   run. He should follow and fall behind.
2. Let him get close and watch for the crouch and the white flash. Run the moment you see
   it. Then try running straight past him instead.
3. Get chased, run until you are out of his beam, and keep out of it for two seconds.
4. Get chased and hide where he can see you. Then get chased, lose him first, and hide.
5. Sneak up behind a guard and press Space once. Then press Space in front of one.
6. Get caught on purpose and read "How you got caught" on the score screen.
7. Gym: run the course left to right. Then run it again for a better time.
8. Gym: press F1, move the sliders, and try the jumps and the gaps again. If you find
   numbers you like, press "Copy values" and send them to me.
9. Is it a chase now? Is the head start too long, too short, or about right?
10. All four playtest questions.

---

## Step 10: Playtest 4 (cover blocks sight, picture quality, gym values, shove, throwables)

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-10-playtest-4`
- **Playtest 4 results (Adam):** won. Rank Shadow, 5:03 left on 7:00, spotted 0, knockouts
  6, bodies found 0. Keycard grabbed fast, silent alarm fired (office guard knocked out).
  Finished after 8 to 10 tries, down from dozens: the chase changes made it fair. Running
  helps a lot. The timer is more stressful now (good). Vents still feel like a reward.
  Hiding is less tense, mostly because he has learned the guards. Radio check-ins: keep
  them. Wants a way to stun guards and run, not just knock out from behind.
- **Not changed:** patrols, vision cone sizes, the chase, knockouts from behind, the radio
  check-ins, the 7:00 timer, and the main map (apart from the items lying in it).
- **Links:**
  - Main game: https://tusingw29.github.io/carter-island-prototype/
  - Gym: https://tusingw29.github.io/carter-island-prototype/?room=gym

### What was built

1. **Bug fixed: guards saw through solid objects.**
   - **Cause:** sight only asked "is the player inside the cone?". Nothing checked what
     stood in between. Only the gym has solid things in the walking lane, so only the gym
     showed it.
   - **Rule now:** a guard sees you if any of six points up your body, feet to head (head
     and chest are two of them), is in his beam with a clear straight line from his
     flashlight. If every line is cut by something solid, he cannot see you.
   - **Tall and low cover:** behind a crate taller than you, you are hidden standing.
     Behind a low one, only crouching. His close-up rule (within 1.2 m in front) now needs
     a clear line too, and only works when you are on his level.
   - **The drawn cone** is cut off by obstacles, so the shadow behind each crate shows.
     The debug outline (F1) draws the same shape.
   - **Cameras** follow the same rule: on the watched floor, with a clear line from the
     camera to your head or chest. Their beams are drawn cut off the same way.
   - **Bodies:** a knocked-out guard behind a crate is not found.
   - **Every room checked:** in the six prison rooms and the duct nothing solid stands in
     the walking lane. Lockers, carts, and beds are on the back wall, shelves and the
     counter stand in front of the lane, and tables have the lane running under them. A
     test now fails if that ever changes without sight being checked. In the gym all seven
     crates, walls, and the ledge block sight, and there is one new low crate past the end
     of the guard's patrol for trying low cover.
2. **Bug fixed: picture stuck at 55%.** The automatic drop never came back up. Now three
   seconds of fast frames step it up one level (55% to 75% to 100%). If the higher level
   turns out too slow and it drops again, the next try waits twice as long, so it does
   not flicker. The `?low` link still stays at 55% on purpose.
3. **Adam's gym values are the defaults** in `config.js`: jump 1.5 m, dash 4.5 m. The
   dash gap in the gym is 1 m wider (5.5 m), because with the higher jump a late running
   jump could clear the old one without a dash.
4. **Shove** (main game and gym). Space or X on an awake guard within 1.4 m who cannot be
   knocked out: he is stunned for 1.5 s and staggers back 1 m. It is as loud as running,
   sets off the Alert if he was not Alert, and counts as spotted if you were not already.
   8 second cooldown, shown as the small SHOVE meter under the timer (green and full when
   ready). It stops a lunge that is winding up. Lighter hit feedback than a knockout:
   half the freeze, under half the shake, a white flash, no "Zz".
5. **Throwables** (main game and gym). Pick up with E, one at a time, shown top right.
   Hold F (Left Bumper) to see the arc as a dotted line, let go to throw: about 6 m.
   - **Hit a head:** stunned 1.5 s, goes Suspicious, turns toward where it came from, then
     walks there to look. A chasing guard is stunned and stays Alert.
   - **Miss:** it lands with a clatter heard 6 m away (soap: 5 m). Calm guards in earshot
     go Suspicious and walk to where it landed.
   - **Where they are:** three cups in the Mess Hall, two bars of soap in the Laundry, a
     cup in the Cell Block, an oil can in Maintenance, a mug in the Stairwell, and a cup
     on top of the tall crate in the gym.
   - Thrown items are used up. A new run puts them all back.

### Planning bot after the vision fix

| Route | Clean run | Time | Change |
| --- | --- | --- | --- |
| Front door in, front door back | yes, Ghost | 2:14 | none |
| Front door in, one-way drop home | yes, Ghost | 1:36 | none |
| Vent route | yes, Ghost | 1:23 | none |

The times did not change, and the reason is the room check above: no prison room has a
solid object in the lane, so seeing through objects was never making a main-game route
harder. It was a gym-only bug. The bot now uses the cover rule for guards and cameras, so
it will count cover the moment a room has some (the Yard will).

### Choices I made that Adam should check

- **Shove turns you round.** The spec says "while facing a guard". If the only guard in
  reach is behind you, Space turns you to face him and shoves. Without that, a guard who
  catches you from behind could not be shoved at all.
- **"TOO RISKY" is gone.** Space on a guard who can see you now shoves. If the shove is
  not ready, the red shake says "SHOVE NOT READY".
- **Controller zoom moved** from Left Bumper to a click of the left stick, because the
  spec gives Left Bumper to throwing.
- **A throw is flat.** It never rises above head height, so a guard within about 4.5 m in
  the direction you face is always hit. To lure, throw when he is further away, or throw
  the other way.
- **Throwing from a dark patch** does not give you away. Throwing from inside a locker,
  cart, or under a table is not possible.
- **A hit on the head does not count as spotted.** He goes Suspicious, not Alert.
- **Tables do not block sight.** They are still hiding spots you get under with Up.
- **Not fixed:** the soft glow a flashlight throws on the back wall still shows past a
  crate. The cone, which is what he sees, is cut off correctly.
- **Not verified:** not played by a person, sounds unheard, rumble, a controller, and the
  2015 MacBook Air untested. Checked by tests, the planning bot, and headless Chrome.

### How Adam tests it

1. Gym. Go to the tall crate before the guard and stand behind it. His cone should stop
   at the crate and he should not see you.
2. Gym. Get to the low crate just before the finish line. Stand behind it, then crouch.
3. Gym. Pick up the cup on the tall crate (E). Hold F to see the arc, let go. Try to hit
   his head, then restart and land it past him.
4. Main game, Mess Hall. Pick up a cup, throw it behind a guard, and walk past while he
   looks.
5. Walk up to a guard's front and press Space. Run while he staggers. Watch the SHOVE
   meter fill.
6. Get chased, let him get close, and shove him as he crouches to lunge.
7. Press F1 and read "picture at ...%" on the second line. If it drops, it should climb
   back within a few seconds of the game running smoothly.
8. All four playtest questions.

---

## Step 11: The Yard (jump and slide everywhere, dash unlock, towers, searchlights, roof route)

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-11-yard` (built on Step 10, which was merged first)
- **Goal:** the first area built for the platforming movement. It tests whether Mega Man X
  style movement works inside the stealth game, and whether the loop holds up when the
  world grows. Adam's spec is in [DESIGN.md](DESIGN.md) under "The Yard".
- **Not changed:** walking and running speeds, the 7:00 timer, guards and patrols inside
  the prison, and the three old routes (the bot's times for them are the same).
- **Links:**
  - Main game: https://tusingw29.github.io/carter-island-prototype/
  - Starts at the Yard door: https://tusingw29.github.io/carter-island-prototype/?room=yard
  - Yard with the boots already on: https://tusingw29.github.io/carter-island-prototype/?room=yard&boots
  - On the roof ledge with the boots: https://tusingw29.github.io/carter-island-prototype/?room=yard&px=20&py=5.4&boots
  - On Tower 1, behind its guard: https://tusingw29.github.io/carter-island-prototype/?room=yard&px=37&py=5.8

### The Yard, left to right

```
 x (m)   0        8     11............31.5  33.5..37.5   40....47  49.5  51.5..56.5  57.8..64.3   69..73    82
 ROOF    [window sill]   [=== roof ledge ===]  [TOWER 1]                                          [TOWER 2]
              gap: needs the dash        gap: a jump
 GROUND  door  low   bench, hoop,   scorer's  ladder   bleachers  tall   crates    shed (hatch   ladder   OUTER
         (dark) fence  light pole     table                       fence            on the roof)           WALL
                |<-- searchlight 1 -->|                             |<------ searchlight 2 ------>|
                                        |<- ground guard ->|
```

### What was built

1. **Jump and slide in the main game**, from the start of every run, with the gym values
   (1.5 m jump). K or B jumps. S + K while moving slides. Walking, running, and crouching
   use the same speeds as before, with instant start and stop.
2. **Dash is locked** until you pick up the work boots in the equipment shed. The gym still
   has every move. Holding dash while you jump does nothing without the boots.
3. **Noise:** jumping and landing are heard 1.5 m away (less than walking), a slide 1 m, a
   dash 11 m. A jump at running speed is as loud as running, at take-off and landing.
4. **Engine:** ledges you can jump up through and stand on (S + K standing still drops you
   back through), ladders (hold Up or Down, Jump lets go), and chain-link fences you climb
   by holding Up against either side. Guards, hiding spots, doors, items, and noise all
   take height into account now.
5. **Mess Hall side door** to the Yard, creaky, at the kitchen end. Both sides of it are in
   shadow, so you never arrive in a flashlight.
6. **Court:** open ground swept by Tower 1's searchlight. A bench at the west end and the
   scorer's table at the east end are low cover: crouch behind one and neither the light
   nor the ground guard can see you. The basketball lies in the middle.
7. **Searchlights:** a pool of light 4.4 m wide that sweeps on a fixed beat, the same every
   run. At each end of its sweep it swings away off the ground for 3 seconds: that is the
   gap to cross in. A glow on the ground shows where it will come back down, and a fainter
   glow runs ahead of the pool while it moves. Stand in the pool for a third of a second
   and the tower guard calls it in: every guard in the Yard goes Suspicious, the ground
   guard walks over, and it counts as spotted. Solid cover casts real shadows: the pool is
   drawn with the shadow missing.
8. **Towers:** each has a ladder that comes up behind its guard. Knock him out and his
   light goes dark for the rest of the run, even after he wakes. He is on the radio: a
   missed check-in sends the ground guard to the foot of the tower.
9. **Ground guard:** walks between the scorer's table and the bleachers, past the foot of
   Tower 1. He cannot cross the tall fence.
10. **Bleachers:** three rows you can climb, and Up hides you underneath (you can crawl
    along, as under a table).
11. **Fences:** the low one (1.2 m) west of the court can be jumped. The tall one (3 m)
    cannot. Either can be climbed at 1.1 m per second, in plain view: chain-link does not
    block sight.
12. **Jump challenge to the boots:** bleachers, top of the tall fence, top of the crate
    stack, shed roof, hatch. No dash needed. The crates can also be climbed from the
    ground on either side.
13. **Equipment shed:** in by the roof hatch, out by the door, which only opens from
    inside. The work boots are on a crate in the middle.
14. **Roof route:** from Tower 1's platform a jump reaches the roof ledge. At its west end
    a 6 m gap to the window sill needs the dash (a dash jump, or jump then air dash). The
    window works both ways. There is a second way up with jumps only: bench, hoop rim,
    backboard, light pole, roof.
15. **Basketball:** bounces twice, and each bounce is heard 11 m away (a cup: 6 m).
16. **Outer wall:** Up at it says "Too high. You'll need something to get over this."
17. **Map:** the Yard (with Tower 1 and Tower 2 marked), the shed, and the roof ledge as its
    own box beside the Guard Office. The roof box shows once you get up there. The window
    shows once you walk up to it from either side.
18. **Camera:** lifts to follow you up a tower or along the roof. A jump does not move it.

### Planning bot

| Route | Result | Time | Left on 7:00 |
| --- | --- | --- | --- |
| Front door in, front door back | Ghost | 2:14 | 4:46 |
| Front door in, one-way drop home | Ghost | 1:36 | 5:24 |
| Vent route | Ghost | 1:23 | 5:37 |
| Bed to work boots in hand | not noticed | 1:09 | |
| Boots, hoop climb to the roof, dash, window, drop home | Ghost | 2:59 | 4:01 |
| Boots, Tower 1 (its guard knocked out), roof, dash, window, drop home | Shadow, 1 knockout | 2:14 | 4:46 |

- **Does boots-then-roof fit in 7:00?** Yes, both ways, with four minutes or more left.
- The three old routes are unchanged to the tenth of a second.
- The tower way is as fast as the front door and never goes near the Stairwell.
- **How the Yard bot works:** the old planner only knows flat floors, so the Yard legs are
  fixed series of moves (walk here, jump there, climb). For each leg the bot tries later
  and later start times on a copy of the game until one goes unnoticed, then plays it for
  real. It has perfect timing. A person will be slower, and the bot cannot say how the
  jumps feel.
- The hardest leg for the bot is getting back west past the ground guard (it waited 17
  seconds on the ladder for the moment).

### Choices I made that Adam should check

- **The searchlight swings away at each end.** The spec says a fixed path and timing. In a
  side view a light that never leaves the lane cannot be crossed without cover, so each
  light is off the ground for 3 seconds at each end of its sweep.
- **The ground guard does not walk the whole court.** He patrols its east end and the foot
  of Tower 1. With him and the light both on the open court, no clean crossing existed.
- **Two fences, not one with low parts.** In a side view a fence is one height where you
  meet it, so there is a low fence and a tall fence.
- **Getting past a tower guard unseen is not possible.** He faces along the roof. The tower
  way to the roof needs him knocked out. The hoop climb is the way that needs no knockout.
- **A searchlight is not a security camera.** Being lit does not count toward the silent
  alarm when you take the keycard.
- **Tower guards never leave their towers.** Alerted, they stay up there. The ground guard
  does the chasing, and a guard from the Mess Hall can be sent in by radio.
- **The ground guard cannot find a body on a tower.** He walks to the foot of it, looks
  around, and goes back.
- **The roof ledge and chain-link cast no shadow** and do not block sight. Crates, the
  bench, the table, the bleacher rows, the tower platforms, and the shed roof do.
- **The shed is a small room of its own**, not a hollow box in the Yard.
- **You can now jump in every room.** A jump takes you above a lunge for a moment, which
  may make chases easier than in Step 9. Not tuned.
- **The repo rule test** that stops game logic touching the browser now ignores text in
  quotes, because a portal of type 'window' set it off.
- **Not verified:** not played by a person. I do not know if the jumps feel fair, if the
  searchlight timing is readable, or if the Yard is too hard or too easy. Sounds unheard,
  a controller and the 2015 MacBook Air untested. Checked by 348 tests, the two bots, and
  headless Chrome screenshots.

### How Adam tests it

1. Open the Yard link. Stand in the dark at the door and watch one whole sweep of the
   searchlight: across, away, back, away.
2. Jump the low fence (K) and crouch behind the bench. Let the light pass over you.
3. Follow the light east and cross to the scorer's table while it is swung away.
4. Watch the ground guard. When he walks away, go over the table and follow him to the
   ladder. Climb above his head before he turns.
5. Wait for him to pass under you, then go for the boots: up the bleachers, onto the fence
   top, the crates, the shed roof, the hatch.
6. With the boots, press L to dash. Leave by the shed door.
7. Get back to Tower 1, climb it, crouch-walk up behind the guard, and knock him out. His
   light should go dark.
8. Jump from the tower to the roof ledge, run to its west end, and dash jump (hold L, press
   K) to the window sill. Up at the window.
9. Take the keycard and go home your own way. Try the window again from inside.
10. On another run, try the hoop climb to the roof, the basketball as a lure, and climbing
    a fence with Up.
11. Open the map (M) before and after finding the roof and the window.
12. Does the movement work inside the stealth game? Does the Yard make you want to explore?
13. All four playtest questions.

---

## Step 12: Playtest 5 (searchlight and crate bugs, quieter sneaking, takedown system)

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-12-takedowns` (built on Step 11)
- **Playtest 5 results (Adam):** caught in the Cell Block with 5:42 left. Grabbed 1.0 s
  after the "!" (Cell Block guard, up close). Spotted 7, knockouts 2, keycard grabbed
  fast, no silent alarm. Three bugs with screenshots from the Yard. Wants a Metal Gear
  Solid V / Hitman style takedown system with options. Guards hear him too easily when he
  walks up behind them.
- **Not changed:** vision cones, patrols, the chase numbers, the shove, throwables, the
  security cameras inside the prison, the 7:00 timer, and the map layout.
- **Links:**
  - Main game: https://tusingw29.github.io/carter-island-prototype/
  - Yard, on the crates where the searchlight bug was, with the debug outlines on:
    https://tusingw29.github.io/carter-island-prototype/?room=yard&px=55&py=2.4&debug
  - Yard door: https://tusingw29.github.io/carter-island-prototype/?room=yard
  - Gym: https://tusingw29.github.io/carter-island-prototype/?room=gym

### Part 1: the three bugs

1. **Searchlight detected you where there was no light.**
   - **Cause:** the game asked "is the player on the stretch of floor the light is aimed
     at, with a clear line to the lamp?" The picture drew the beam going to that floor.
     On the crates you were over that stretch of floor, with a clear line to the lamp,
     while the beam itself passed under your feet and ended against the crates or on the
     shed roof. Two different shapes.
   - **Fix:** one function, `searchlightShape`, makes the shape of the light. The renderer
     draws it and the game asks "is any part of the body inside it?". A test compares the
     two at about 20,000 positions around the Yard.
   - **Height:** it now lights whatever it reaches. On the shed roof, in the part of the
     roof the light lands on, you are lit. On top of the crate stack you are not, at any
     point of either sweep.
   - **Pools:** drawn on the ground and on top of whatever the beam hits (the shed roof).
   - **Warning glow:** now amber and pulsing. It runs just ahead of the pool while it
     sweeps, and grows on the spot where the light will come back down.
   - **Debug (F1):** each searchlight's detection area is outlined in red. It sits exactly
     on the edge of the drawn light.
   - **One side effect:** the beam comes in at a slant from the tower, so on the tower's
     side of a pool it passes over ground the pool has not reached. Stand there and it
     catches your head. This is drawn, so what you see is still what you get.
2. **A guard walked through a crate.** Guards now stop at solid props. Anything up to
   1.4 m high he vaults, which takes 0.8 s (he leans and climbs over, "hup" over his
   head). Anything taller stops him: he looks from his side and gives up. A lunge and a
   shove cannot carry him through one either. Every patrol was checked: none passes
   through anything, and a test now fails if one ever does.
3. **"Grabbed 1.0 s after the !" in the Cell Block.** The pause and the wind-up both
   applied. Replayed in the Cell Block with the guard 1 m away:

   | What the player does | "!" to grab |
   | --- | --- |
   | Stands still | 0.95 s (0.6 pause + 0.35 wind-up) |
   | Crouch-walks away | 1.37 s |
   | Walks away | 1.97 s |
   | Runs away | no grab, out of the room |
   | Walks, then runs when he crouches | no grab, the lunge misses |
   | Jumps when he crouches | no grab, the lunge misses |

   0.95 s is the fastest a grab can come, and the score screen shows it as 1.0 s. So you
   were still within 1.2 m of him when his pause ended. Nothing was skipped. Not changed.

### Part 2: quieter sneaking

- **Walking** is heard from 1 m (was 2.5 m). Grab reach is 1.1 m, so you can walk up
  behind a guard and grab him unheard. **Running** is still heard from 8 m.
- **Hearing meter:** an arc over the guard's head. Footsteps in earshot fill it in about
  a second at the edge of earshot and twice as fast up close. At 40% he stops and glances
  back for 0.8 s (a real look: he can see you), then carries on. Full, he goes Suspicious
  and walks to the sound. It drains at half a meter per second when you are quiet.
- **One-off noises:** a loud one (a thrown cup landing, a slammed door, a dash, a guard
  thrown down) fills the meter at once. A small one (a jump, a landing) half fills it.
- **Crouch-walking** is silent and now 2.24 m/s, 70% of walking (was 1.5).
- **Noise ring:** a faint green ring round you, always shown, the size of your footsteps'
  reach. One-off noises flash a ring where they happen.

### Part 3: takedowns

- **Grab:** "SPACE: grab" behind an unaware or sleeping guard. A panel shows the choices
  with keyboard and controller buttons, and a bar for the 6 seconds before he breaks free.
- **Knock out** (Space / X): as before. Counts as a knockout.
- **Interrogate** (hold E / A, 3 s): you cannot move. The 6 second clock stops while he
  talks and starts fresh afterwards. Then Space knocks him out, or E lets him go.
- **Let go:** he is dazed for 2 s, then raises the alarm. No knockout on your record.
- **Throw** (F / Left Bumper): stunned 2 s, heard 10 m away, then he is up and Alert.
- **Drag** (A / D or the stick): 1.2 m/s, facing him the whole time.
- **Radio code:** from every interrogation. Knocked out, his check-ins show "Check-in
  faked" and nobody is sent, until he wakes.
- **One extra per guard:**

  | Guard | Gives up |
  | --- | --- |
  | Cell Block | story |
  | Laundry | story |
  | Mess Hall 1 | patrol reveal (Mess Hall, 60 s on the map) |
  | Mess Hall 2 | story |
  | Stairwell | secret: the camera panel is in the Maintenance Hall |
  | Guard Office (the sleeper) | secret: the work boots, and the hatch goes on your map |
  | Yard, ground | patrol reveal (Yard, 60 s on the map) |
  | Tower 1 | story |
  | Tower 2 | story |
  | Gym | story |

- **Story lines (6):** your three examples, used as written, and three new ones: "They
  sealed Shaft Nine in a day. Nobody brought the crew up first.", "The dogs will not cross
  the Yard after dark. They never used to mind.", "My badge logs a door on sub-level four.
  There is no sub-level four."
- **From above:** "SPACE: drop on him" when you stand 1 to 8 m above an unaware guard and
  within 1 m sideways. Works from the gym ledge and from Tower 1's platform.
- **From a hiding spot:** "SPACE: pull in" when an unaware guard is within 1.2 m of the
  locker, cart, table, desk, counter, shelf, or bleachers you are in.
- **Score screen and playtest text:** takedowns by type, guards thrown down,
  interrogations, check-ins faked.
- What guards told you is listed under the map (M).

### Planning bot, new hearing and guard collision rules

| Route | Result | Time | Before |
| --- | --- | --- | --- |
| Front door in, front door back | Ghost | 2:14 | 2:14 |
| Front door in, one-way drop home | Ghost | 1:36 | 1:36 |
| Vent route | Ghost | 1:23 | 1:23 |
| Bed to work boots in hand | not noticed | 1:08 | 1:09 |
| Boots, hoop climb to the roof, dash, window, drop home | Ghost | 2:14 | 2:59 |
| Boots, Tower 1 (its guard grabbed and knocked out), roof, window, drop home | Shadow | 2:14 | 2:14 |

- The faster crouch saves time inside rooms (the duct crawl went from 17.8 s to 12.0 s),
  but most routes end by waiting for the same gap in the Cell Block guard's patrol, so the
  totals barely move. The hoop route caught an earlier gap and is 45 s faster.
- The bot counts a glance as being noticed, so its runs never fill a hearing meter at all.
- No bot route makes a guard meet a crate, so the collision rule changes none of them.
- **A bot bug fixed:** with the new timing the planner tried to hide beside the new Yard
  door in the Mess Hall and opened the door instead. It now never presses Up for a hiding
  spot when a door is as near.

### Choices I made that Adam should check

- **Security cameras inside the prison are unchanged.** They still use "on the watched
  floor, with a clear line". Only searchlights got the shared-shape rule. The cameras have
  no platforms under them, so the two rules cannot disagree there by much, and changing
  them would move the bot's routes. Say if you want them on the same rule.
- **"Let him go" means he raises the alarm** after 2 s. The spec did not say what a
  released guard does.
- **Six story lines, not eight.** Each guard gives one extra, there are ten guards, and two
  patrol reveals and two secrets took four of them. No guard gives a vent or a throwable
  as a secret.
- **A glance is a real look.** If you are in the open behind him when the arc reaches 40%,
  he sees you. Running up behind a guard is now worse than before at close range.
- **A vault costs him about half a second net**, not 0.8, because the vault also carries
  him 1.7 m. Say if you want it slower.
- **Guards still walk under the bleachers and tables.** Those are not solid props.
- **A stunned guard no longer counts as "lost you".** Before, the 2 seconds on the floor
  after a throw would have used up the 2 seconds it takes to lose him. This also makes a
  shoved guard a little more persistent.
- **Jumping still dodges a lunge** (see the table above). Not tuned.
- **Not verified:** not played by a person. I do not know if the takedown choices feel
  good under pressure or if 6 seconds is right. Sounds unheard, a controller and the 2015
  MacBook Air untested. Checked by 393 tests, the two bots, and headless Chrome.

### How Adam tests it

1. Open the Yard crates link. Stand on the crates through a few sweeps: no call-in. The
   red outline is the detection area and should sit on the edge of the light.
2. Jump down and watch a pool arrive: amber glow first, then the light.
3. Get chased by the Yard guard and run west over the scorer's table. He should climb over
   it. Then put the tall fence between you: he should stop.
4. Main game. Walk up behind a guard (no crouch). Watch the arc over his head: it should
   stay empty. Then try running up behind one.
5. Grab a guard (Space). Read the panel. Knock him out with Space.
6. Grab another and hold E. After he talks, knock him out, wait for his next check-in, and
   look for "Check-in faked".
7. Grab one and press F, then run.
8. Grab one and do nothing for six seconds.
9. Hide in a locker and pull a passing guard in. In the gym, drop on the guard from the
   ledge.
10. Interrogate Mess Hall guard 1 and open the map (M).
11. Read the new lines on the score screen.
12. Do the options change how you plan a room? Which ones did you never use?
13. All four playtest questions.

---

## Step 13: Readable stealth (lit or hidden look, last-seen markers, solitary)

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-13-readable-stealth` (built on Step 12)
- **Why:** three rules from Mark of the Ninja: show the stealth rules on screen, warn before
  enemies react, and do not punish failure so hard that players replay long stretches.
- **Not changed:** vision cones, patrols, hearing, takedowns, the timer length, and every
  bot route (see the table).
- **Links:**
  - Main game: https://tusingw29.github.io/carter-island-prototype/
  - Guard Office, beside the desk lamp: https://tusingw29.github.io/carter-island-prototype/?room=guard-office&px=6
  - Mess Hall, in front of a guard (stand still to be caught): https://tusingw29.github.io/carter-island-prototype/?room=mess-hall&px=13

### What was built

1. **Lit or hidden.** You are either full color with a soft glow, or a black shape with a
   thin pale outline. It switches at once.
   - **One check:** the look asks the same three functions the game asks every step: can
     this guard see the player, can this camera or searchlight, can this snitch. So it
     covers flashlights, cameras, searchlight pools, cover, dark patches, and hiding spots
     without a second copy of any rule. Snitches count too.
   - **Lit areas:** four lamps, each with a fixture, a real light, and a lit patch of
     floor: the Guard Office desk lamp (the keycard is in its light), the Stairwell
     checkpoint counter, a work lamp in the Laundry, and the Mess Hall kitchen corner.
   - **What a lamp does:** in its light you always show as visible, and a guard who has
     you in his beam is sure in 0.3 s however far away he is. Out of his beam it changes
     nothing, so the bot's clean runs are untouched. No lamp overlaps a dark patch.
2. **Last seen.** A pale ghost of the player stands where each hunting guard thinks you
   are: his last known position while he chases, the middle of his search while he
   searches, the noise if a noise pulls him off. One ghost per guard. It shows only while
   he cannot see you, and fades over half a second when he calms down.
3. **Solitary.** The first capture of a run fades to black with "SOLITARY", takes 60
   seconds off the timer (shown in red under the timer for 8 s), and puts you in a new
   Solitary room. After 4 seconds a guard opens the door and you are walked to your bed.
   E skips to the bed.
   - **Taken:** the keycard (back on the desk) and whatever throwable you carried.
   - **Kept:** screwdriver, work boots, cigarettes, bedsheets.
   - **After:** every guard is wary for the rest of the run, and you have one mash-to-escape
     again. The next capture ends the run.
   - **Score:** "Solitary: Yes, 1:00 lost" or "No". A win after solitary is ranked Inmate.
   - **Map:** the Solitary box appears left of the Cell Block once you have been there.

### Planning bot

| Route | Result | Time | Before |
| --- | --- | --- | --- |
| Front door in, front door back | Ghost | 2:14 | 2:14 |
| Front door in, one-way drop home | Ghost | 1:36 | 1:36 |
| Vent route | Ghost | 1:23 | 1:23 |
| Bed to work boots in hand | not noticed | 1:08 | 1:08 |
| Boots, hoop climb to the roof, dash, window, drop home | Ghost | 2:14 | 2:14 |
| Boots, Tower 1 (guard knocked out), roof, window, drop home | Shadow | 2:14 | 2:14 |

All six are the same to the tenth of a second.

### Choices I made that Adam should check

- **Lamps have a rule, not only a look.** The spec says lit areas make you visible. With
  nobody looking that would be a look with no meaning, so in a lamp's light a guard who
  sees you is sure at once. Say if you want lamps to be cosmetic, or to do more.
- **The walk back shows no guard.** You are moved to your bed with a message. Nothing can
  see, hear, or grab you on the way, and no button hints show.
- **The clock keeps running in solitary.** The trip costs about 9 more seconds unless you
  skip. If the 60 seconds empties the clock, the run ends as "out of bed at headcount".
- **A bed check that falls while you are in solitary is skipped.**
- **Cigarettes and bedsheets are kept**, like the tools.
- **A silent alarm that already fired stays fired.** Taking the keycard again does not
  need to set it off twice.
- **The look can lead a guard's senses by one step** (1/120 s) on the step he turns round,
  because he looks, then moves. The test allows exactly that and nothing more.
- **Test rooms and the gym have no solitary cell**, so a capture there ends the run as before.
- **Not verified:** not played by a person. I do not know if the silhouette reads well on
  your screen or if 60 seconds is the right price. Sounds unheard, a controller and the
  2015 MacBook Air untested. Checked by 413 tests, the two bots, and headless Chrome.

### How Adam tests it

1. Open the Guard Office link. You should be a black shape. Walk to the desk: full color.
2. Main game. Stand in a dark patch, step into a flashlight, hide in a locker. Watch your
   color each time.
3. Get chased and break line of sight. Look for the pale ghost where he thinks you are.
   Make a noise somewhere else and see if it moves.
4. Open the Mess Hall link and stand still. Do not mash. You should see SOLITARY, lose a
   minute, and end up in bed. Try E to skip on another run.
5. Check the keycard is back on the desk and your tools are still with you.
6. Get caught again: the run should end.
7. Win a run after a trip to solitary and read the rank and the Solitary line.
8. Does the silhouette tell you at a glance? Does solitary make you keep going?
9. All four playtest questions.

---

## Step 14: Heat-up (awareness meters, spotted counts, takedown menu, drops, ghost)

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-14-heat-up` (built on Step 13)
- **Playtest results (Adam, two runs):** Run A won with 0:10 left as Inmate, spotted 17,
  knockouts 8 (5 pulled into hiding). Run B ran out of time without the keycard, spotted
  25, went to solitary once. Pull-ins are fun and fair: kept as they are. Interrogation
  never used ("the controls and setup seem off"). Drops never used: no good ledges, and he
  did not know he could. The lit or hidden look helped a lot. The ghost may not have been
  noticed. Getting spotted is too easy: he wants a heat-up meter and a clear tell.
- **Not changed:** cone sizes, patrols, the chase, pull-ins, hearing, solitary, and the
  7:00 timer.
- **Links:**
  - Main game: https://tusingw29.github.io/carter-island-prototype/
  - Mess Hall, at the catwalk ladder: https://tusingw29.github.io/carter-island-prototype/?room=mess-hall&px=12.3
  - Cell Block, at the pipe ladder: https://tusingw29.github.io/carter-island-prototype/?room=cell-block&px=9.9

### Explain the 25 (measured on the Step 13 rules, before anything was changed)

What added 1 to "spotted" then:

| Source | When it counted | 20 seconds of it |
| --- | --- | --- |
| Guard sight | each time a room went to Alert with no guard in it already Alert | 1 per chase, plus 1 for every time he lost you and saw you again |
| Camera | every time it called in, with a 4 s cooldown | 5 |
| Searchlight | the same | 5 |
| Snitch | every yell, with a 5 s cooldown, while he looked your way | 3 |
| Shove, guard thrown down, let go, or broke free | once each, if nobody there was Alert | |
| Empty bed, or a sleeper waking | once | |
| Noise | never | 0 |

- **Yes, one sighting was counted many times.** Standing in a camera or a searchlight for
  20 seconds counted 5. A snitch counted again every 5 seconds. One guard losing you and
  finding you again counted each time.
- **A scripted careless run** (walk the front-door route without hiding, run when chased)
  counted 5 before it was caught: 3 from guards and 2 from snitches. The run was short.
- **Where 25 likely came from:** your run was not recorded, so this is a reading of the
  rules, not a replay. Run B lasted the full seven minutes with no keycard, which means a
  lot of time near the same guards. Each chase that broke and re-formed added 1, and each
  pass by the Cell Block snitches or a camera added 1 for every few seconds in view. Noise
  added nothing. On those rules 25 is about what a long, hunted run would show, and it
  overstated how often you were truly caught out.
- **Now:** a camera, searchlight, or snitch counts once per stay in its view (it has to
  lose you until its meter is empty before it can count again). A guard hunt counts once
  from the first "!" until those guards calm down. The same three 20-second tests now
  count 1, 1, and 1.

### What was built

1. **"Spotted by"** on the score screen and in the playtest text: guards, cameras,
   searchlights, snitches, other. "Other" is a shove, a guard thrown down or let go, a
   sleeper waking, or the empty bed. The counts add up to the total.
2. **Heat-up detection.** Each guard, camera, searchlight, and snitch has its own meter,
   drawn as a ring over it that fills.
   - **Fill times:** guard 2.0 s at the far edge of his beam and 0.8 s up close (was 1.3
     and 0.3). Camera and searchlight 1.2 s (was 0.35). Snitch 1.0 s (was 0.3).
   - **Slower:** crouching halves the rate. Standing still halves it. Both quarter it.
   - **The tell:** the ring pulses while it fills, a note climbs in four steps, and cameras
     and searchlights beep faster and faster. At a third full a guard goes "?" and comes
     to look. Full is the "!" and the Step 9 pause.
   - **Off screen:** the ring sits at the edge of the screen as an arrow pointing to it.
   - **Draining:** 0.35 per second once you are out of view, drawn half faded. Step back
     in early and it carries on from where it was.
   - **Snitches:** the ring over his cell is his squint. He is not redrawn pointing.
3. **Takedown menu.** A small pop-up beside the guard with the four choices and their
   keyboard and controller buttons, and a bar for the time before he breaks free.
   - Knock out: Space / X. Interrogate: Q / Y. Throw: F / Left Bumper. Drag: move.
   - **One press** starts the interrogation. It runs for 2 s by itself with a progress
     bar. You cannot move meanwhile. Space still knocks him out half way.
   - His line shows as a speech bubble under him. Then "Radio code learned: his check-ins
     will be faked", then the extra as its own message ("Patrol reveal: ...", "Secret
     learned: ...", or "He said: ...").
   - After he talks the pop-up shows Knock out, Let go (Q / Y), Throw, Drag.
   - One-time hint on your first grab. An "Interrogations" line on the controls screen.
4. **Places to drop from.** A run of pipes with a ladder over the guard's beat in the Cell
   Block (x 9.6 to 13.4), the Laundry (16.3 to 20.3), and the Mess Hall (12 to 16.4, between
   the first two tables). In the Yard, Tower 1's platform is over the ground guard's beat.
   Guards and snitches do not see you up there. A pulsing arrow marks the guard you can
   drop on, with "SPACE: drop on him". One-time hints at a ladder and at your first drop.
5. **Ghost marker.** Brighter, with a pulsing outline. The first three of a run carry the
   words "last seen". One-time hint the first time one appears.

### Controls audit

- **The clash was real.** Interrogate was "hold E", and E is also pick up, the keycard,
  sleep, and the trader. Holding a guard, E now does nothing.
- **Y on a controller** was the Controls screen. It is now Interrogate while you hold a
  guard, and Controls the rest of the time. The controls screen says so.
- **F / Left Bumper** is also "throw what you carry". Holding a guard it throws the guard,
  and the same press never throws your cup as well. No change needed.
- **Q** was unused.

### Planning bot

| Route | Result | Time | Before |
| --- | --- | --- | --- |
| Front door in, front door back | Ghost | 2:14 | 2:14 |
| Front door in, one-way drop home | Ghost | 1:36 | 1:36 |
| Vent route | Ghost | 1:23 | 1:23 |
| Bed to work boots in hand | not noticed | 1:08 | 1:08 |
| Boots, hoop climb to the roof, dash, window, drop home | Ghost | 2:14 | 2:14 |
| Boots, Tower 1 (guard knocked out), roof, window, drop home | Shadow | 2:14 | 2:14 |

Unchanged. The bot is never in anything's view, so slower meters do not alter its runs,
and the pipes are not in any guard's way.

### Choices I made that Adam should check

- **A guard hunt counts once until he calms down**, not once per "!". The spec says once
  per new Alert. Losing him and being found again inside the same hunt would still have
  counted several times under that reading.
- **Standing still slows every meter.** A camera on someone standing still takes 2.4 s,
  and a crouched, still player takes 4.8 s. Freezing when a ring starts to fill is now a
  real choice. Say if that is too generous.
- **At a third full a guard still becomes Suspicious and walks over**, as before. The spec
  says he turns his head. Suspicious guards notice 1.5 times faster, also as before.
- **Under a lamp** a guard is sure at the close-up rate (0.8 s), no longer 0.3 s.
- **The pipes are a safe place.** Nothing sees you up there, so a pipe is also a way to
  let a guard walk past underneath. Each is about 4 m long, and you are in plain view on
  the ladder.
- **Throw stays in the menu after he talks.** The spec lists Knock out and Let go there.
- **Snitches do not visibly squint or point.** The ring over the cell is the tell.
- **The Yard got no new ledge.** Tower 1's platform already sits over the ground guard.
- **Not verified:** not played by a person. I do not know if spotting now feels fair or
  too slow, or if the rings read well. Sounds unheard, a controller and the 2015 MacBook
  Air untested. Checked by 433 tests, the two bots, and headless Chrome.

### How Adam tests it

1. Walk into a flashlight from far away. Watch the ring over the guard fill and listen for
   the climbing note. Step out before it is full and watch it fade down slowly.
2. Do it again crouched, then standing still.
3. Stand in the Stairwell camera's view: beeps speeding up, a ring at the camera.
4. In the Yard, let a searchlight catch you with the tower off screen: look for the arrow
   at the edge of the screen.
5. Grab a guard. Read the pop-up. Press Q once and wait. Read the bubble and the two
   messages. Then knock him out and wait for "Check-in faked".
6. Open the Mess Hall link. Climb the ladder (hold W), wait for the guard to pass under,
   and press Space when the arrow shows.
7. Get chased, break line of sight, and look for the ghost and its "last seen" label.
8. Finish a run and read "Spotted by".
9. Is being spotted fair now? Is the tell early enough to act on?
10. All four playtest questions.

---

## Step 15: Review fixes (heat ladder, drawings match checks, hiding tell, slides, and more)

- **Status:** review, awaiting Adam's verdict
- **Branch:** `step-15-review-fixes` (built on Step 14)
- **Source:** the outside review by Codex, [reviews/codex-review-1.md](reviews/codex-review-1.md).
  Adam approved cards 1, 2, 3, 4, 5, 6, 8, and 10. Cards 7, 11, and 12 are on the board as
  "later".
- **About PR #15:** it was still open, not merged, when this step started. This branch
  includes its commit, so the review and `tools/review/` reach `main` with Step 15.
- **Kept, as told:** run speed 6.5, chase speed 5.2, the 0.6 s reaction pause, the 0.35 s
  lunge tell, the 7:00 timer, pull-ins, pipes as safe perches, the smart camera, the lit or
  hidden look, and the searchlight shapes.
- **Links:**
  - Main game: https://tusingw29.github.io/carter-island-prototype/
  - Stairwell at heat 2 (walk right to be seen and watch the doors lock):
    https://tusingw29.github.io/carter-island-prototype/?room=stairwell&px=5&heat=2
  - Mess Hall at heat 0 (get chased and run out of the east hall):
    https://tusingw29.github.io/carter-island-prototype/?room=mess-hall&px=24

### Before and after

The review's own scripts in `tools/review/`, rerun on this build, and the planning bot.
The reviewer's result files are left as they were. The rerun is summed up in
`tools/review/after-step-15.json`.

| Check | Before | After |
| --- | --- | --- |
| Rusher, 30 departures: wins | 30 of 30 | 27 of 30 |
| Rusher: mean time left | 393 s | 383 s |
| Rusher: grabbed at least once | 0 of 30 | 27 of 30 |
| Rusher: sent to solitary, then caught for good | 0 | 3 (all in the Stairwell) |
| Rusher with grabs and shoves (the review's second reactive bot): wins | 30 of 30 | 23 of 30 |
| Careless walker: wins | 0 of 30 | 0 of 30 |
| Planned Ghost route, 10 departures | 10 of 10, 318.9 s left | 10 of 10, 316.4 s left |
| Planned vent route, 10 departures | 10 of 10, 335.2 s left | 10 of 10, 335.2 s left |
| Planned Yard roof route, 10 departures | 10 of 10, 280.7 s left | 10 of 10, 280.7 s left |
| Pull-in route, 10 departures | 10 of 10, 5 knockouts | 10 of 10, 5 knockouts |
| Fixed-tape replays (Ghost / vent / roof): wins of 30 | 1 / 2 / 2 | 1 / 2 / 2 |
| Camera drawing against check, 100 positions: disagreements | 13 | 0 |
| Crouched at 10.1 beside a guard at 10: seen, and inside a drawn shape | seen, not drawn | seen, drawn |
| Chained slides: average speed | 6.91 m/s | 4.97 m/s |
| Hide at one-third awareness: meter one step later | 1.00, Alert | 0.34, Suspicious |
| The same case: time from the start to the grab | 1.18 s | 2.20 s |
| Pipes in an alarm, 90 s each: seen or grabbed | never | never |
| Recovery after solitary with 240 / 150 / 100 s left | win / out of time / out of time | the same |
| Clean runs (bot): front door, drop, vents | 2:14, 1:36, 1:23 | 2:14, 1:36, 1:23 |
| Clean runs (bot): boots, hoop roof, tower roof | 1:08, 2:14, 2:14 | 1:08, 2:14, 2:14 |

- **The rusher still wins 27 of 30.** What changed is how: every one of those wins was
  caught hold of at the locked Stairwell door and had to spend its one break-free there.
  Before, it was never touched. The three losses were grabbed twice in the Stairwell.
- **Why it still gets through:** the bot mashes free in about a tenth of a second, the
  guard is then dazed for 2.5 s, and that covers what is left of a 6 second lockdown. After
  the Stairwell it takes the card and the drop, which the ladder leaves alone on purpose.
- **One number decides it.** I tried the lockdown at 9 seconds without changing
  `config.js`: the rusher won 4 of 30. At 6 it wins 27. This is a suggestion, not applied:
  6 is the value you asked for.
- **The review's close-guard probe still prints "drawn: false"** because it only looks at
  the beam. The close-awareness box is now drawn as well, and the new test checks both.
- **The planned Ghost route** lost 2.5 s on average at some departures. The Stairwell camera
  now catches what its drawn beam covers, so the bot waits a little longer there.

### What was built

1. **Heat ladder** (review R1). Getting away from a hunt through a door, hall, or stairs
   raises the heat by one, to a most of 3. It never goes down. It shows under the alert
   meter ("HEAT 2: LOCKDOWN") with a message each time it rises.
   - **Heat 1, pursuit:** the chasing guard nearest the door follows you through it,
     1 second after you, with "He's following you!" and two bangs. He arrives with the
     usual 0.6 s pause. He follows through one door per hunt. Afterwards he walks home.
   - **Heat 2, lockdown:** when an Alert starts in the room you are in, its doors, halls,
     and stairs lock for 6 seconds. Each shows a red "LOCKED 4" tag counting down.
   - **Heat 3, radio ahead:** the guards in the room you flee into are Alert as you arrive,
     facing your door, with the usual pause. The office sleeper is not on the radio.
   - **Never part of it:** vents, the one-way drop, the office window, and the shed hatch.
2. **Drawings match checks** (R5).
   - **Guards:** the close-awareness zone is now a drawn box, 1.2 m long and 2 m high, in
     front of every guard, in the same color as his beam. The check is "any body point in
     the beam or in the box, with a clear line".
   - **Cameras:** the check is now the drawn beam, exactly as for searchlights.
3. **Watched hiding** (R6). A guard who sees you get into a hiding spot remembers it, and
   "HE SAW YOU HIDE. UP: get out" shows at the spot at once. His meter keeps filling at its
   usual rate. When he reaches you he leans in for 0.35 s ("HE IS REACHING IN!") before he
   has you. Get out during that and he grabs an empty locker and loses 0.45 s.
4. **Slide recovery** (R2): 0.35 s between slides. One slide is unchanged.
5. **Off-screen Alert arrow** (R7): a guard at full awareness who is off screen keeps a
   red arrow at the edge. On screen, only his "!" shows.
6. **Noise rings and stunned beams** (R8): a one-off noise draws its full reach at once,
   with the pulse growing inside. Rings are centred on the real origin. A dazed guard's
   beam and his close box are drawn grey and faint.
7. **How you got caught** (R11): each guard keeps his own latest Alert. The score line now
   reads `Grabbed by the Stairwell Checkpoint guard 1.0 s after his "!". ...`. Win lines:
   Ghost "nobody knows", Shadow "nobody saw you, but the guards you put down will remember
   it", Inmate "they know somebody was out tonight".
8. **Interrogation payoff** (R3): the pop-up now ends with the stakes, for example "His next
   radio check-in is due in 14 s. Knocked out, he misses it and the Mess Hall guard 2 comes
   to look. Interrogate first and his code stops that." For the office sleeper it says he
   is not on the radio. He gives no code. He gives two secrets: the boots, and the window.

### Choices I made that Adam should check

- **A guard bursting in after you counts as an Alert starting** in that room. So at heat 2
  and up, the room you fled into locks when your pursuer arrives.
- **The escape that raises the heat already gets the new level.** Your first door escape is
  followed. Your third arrives in a warned room.
- **Radio ahead does not count as a new spotting.** It is the same hunt.
- **Lockdown is tied to the room you are in.** A body found in another room locks nothing.
- **A stunned guard does not follow.** Neither does a tower guard or the sleeper.
- **Cameras now catch your head a little outside the floor patch** on the side the camera
  hangs, because that is where the drawn beam is. It moved the planned Ghost route by 2.5 s.
- **The close-awareness box replaces "within 1.5 m of his height".** It is 2 m high from
  his feet, so someone on a ledge above him is not in it and someone jumping past is.
- **Review card 9 is not on the board**, as noted under the table at the top.
- **Not verified:** not played by a person. I do not know if the ladder feels fair or if
  three levels are readable in the heat of a chase. Sounds unheard, a controller and the
  2015 MacBook Air untested. Checked by 459 tests, the review's five scripts, the bots, and
  headless Chrome.

### How Adam tests it

1. Mess Hall link. Get chased and run out of the east hall. Read the message, listen for
   the bangs, and watch him come through a second later.
2. Keep running through the next door. Watch the heat go to 2.
3. Stairwell link. Walk into the guard's view and try both exits while the tags count down.
   Then try it with a vent or the office drop in reach.
4. Run a whole front-door rush. Where does it stop you? Is that the right place?
5. Stand right in front of a guard, crouched. You should be inside the drawn box.
6. Let a guard see you get into a locker. Read the prompt, wait for him, and get out when
   he leans in.
7. Chain slides down a long room.
8. Throw a cup: the ring should show its full reach at once.
9. Grab a guard and read the bottom lines of the pop-up. Then grab the office sleeper.
10. Win as Shadow and as Inmate and read the line under the headline.
11. All four playtest questions.

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
8. **"If a camera saw you take it."** The spec gives the Guard Office no camera, so no
   camera can watch the grab itself. Assumed: if any camera has seen you at any point in
   the run before you take the keycard, taking it sets off the silent alarm. This makes
   avoiding cameras (and later the camera panel) matter.
9. **In bed at 0:00 without the keycard.** The spec only covers out of bed (lose) and in
   bed with the keycard (win). Assumed: a loss, shown as "You were in bed, but without the
   keycard", rank Caught.
10. **What counts as "spotted".** Assumed: a guard reaching Alert because he saw you, a
    sleeping guard waking up, or a camera registering you. A guard going Suspicious and
    finding nothing does not count, and neither does a body being found (that has its own
    score line).
11. **Guards and doors.** Assumed for the prototype: guards never change rooms.
12. **The one-way drop and the screwdriver.** The map legend says vents need the
    screwdriver, but the drop is also the way home for front-door players who have no
    tools. Assumed: the Guard Office floor vent is latched on the inside and opens without
    the screwdriver. Say if the drop should need it.
13. **Duct into the Guard Office.** Assumed one way: you drop out of the ceiling and
    cannot climb back up, so the only ways out of the office are the door and the drop.
14. **Passing a snitch.** As with the standing guard, nobody can walk past a watcher who
    covers both sides of his cell. So each snitch looks one way at a time and has a blind
    spot at his bars.
15. **What "Alert" means for an empty bed.** Guards do not know where you are, so sending
    them to chase you would be unfair. Assumed: every guard goes Alert where he stands,
    searches nearby hiding spots, then stays Suspicious for the rest of the run.
16. **Does the trader trade more than once?** Assumed: once per run, since there is one
    pack of cigarettes.
17. **The standing guard.** In a side view nobody can walk past a guard who never moves,
    so the Stairwell has a checkpoint counter to crawl behind. Say if you would rather he
    paced a short beat instead.
