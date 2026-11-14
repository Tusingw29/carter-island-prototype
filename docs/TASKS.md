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
