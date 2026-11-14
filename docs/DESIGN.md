# Carter Island: design spec

"Carter Island" is a placeholder name. It is a 2.5D stealth prison-escape metroidvania:
Metal Gear style sneaking plus metroidvania backtracking. The goal of this prototype is ONE
thing: find out if the core loop is fun.

The text under each header is Adam's spec, word for word. Do not reword it here. Open
questions and decisions go in [TASKS.md](TASKS.md).

## Core loop

- Lights out. You have 9:00 on a headcount timer (make the length a config value; we will
  tune it between 8 and 10 minutes).
- Sneak out of your cell, steal the KEYCARD from the Guard Office, and be back in your bed
  before headcount.
- The timer never stops. Getting spotted costs time, which is where tension comes from.

## View and look

- 2.5D side view in Three.js. Characters move left and right along a floor line.
- Rooms have depth: a front lane where you walk, and a back wall with lockers, carts,
  doors, and vent covers you interact with by pressing Up/W.
- Simple blocks and flat colors only. No detailed art. All effort goes into feel.
- Lights out: rooms are dim. Guards carry flashlights. Their flashlight IS their vision cone.
- Some pitch-dark spots: if you stand still in one, you are hidden even in the open.

## Map (3 floors, 6 areas, all connected)

```
  FLOOR 2:   [Vent Duct] ======== [Guard Office]
                  ||                 |      || (one-way drop down)
  FLOOR 1:   [Cell Block] --- [Mess Hall] --- [Stairwell Checkpoint]
                 |                   ||           (camera)
  BASEMENT:  [Laundry] ------- [Maintenance Hall]
                               (camera panel, welded vent)
```

  "---" = door or hallway. "===" and "||" = vents (need the screwdriver).
  "|" = stairs.

## Areas

1. Cell Block (Floor 1, hub). Your cell and bed. A few awake "snitch" inmates in locked cells.
   One "trader" inmate. Lockers. 1 patrolling guard. Exit point of the one-way vent drop.
2. Laundry (Basement). SCREWDRIVER is here. Bedsheets for making a dummy. Laundry carts to
   hide in. 1 patrolling guard. Creaky door to Maintenance.
3. Maintenance Hall (Basement). Vent access up into the duct system. Camera control panel
   that turns off the Stairwell camera. One WELDED vent cover that cannot be opened in this
   prototype (a teaser for later). 1 sweeping camera. No guards. Tool shelves to hide behind.
4. Mess Hall (Floor 1). 2 patrolling guards. Tables to hide under. CIGARETTES hidden in the
   kitchen corner (trade item).
5. Stairwell Checkpoint (Floor 1 to 2). 1 standing guard. 1 sweeping camera (unless turned
   off). Creaky door at the top.
6. Guard Office (Floor 2). KEYCARD on the desk. 1 sleeping guard. Hide under the desk.
   A vent that can only be opened from inside: one-way drop straight down to the Cell Block.

## Routes

- Front door (no tools): Cell Block, Mess Hall, Stairwell, Guard Office. Most guards.
  Skilled players can do it. This is the sequence-break route.
- Screwdriver detour: Cell Block, down to Laundry (screwdriver), then Maintenance Hall.
- Vent shortcut: Maintenance vent, up the wall, along the duct above the Mess Hall, drop into
  the Guard Office. Slow crawl, almost no guards. You can peek down through vent grates.
- Way home: the one-way vent drop from the Guard Office into the Cell Block.
- Pacing target: each room takes 30 to 60 seconds to sneak through.

## Unlocks (metroidvania keys)

- Screwdriver: opens vent covers.
- Keycard: the goal item, AND it opens the snitch inmates' cells so you can go in and knock
  them out on the way home.

## Keycard grab (how you take it decides what happens)

- Slow grab (hold Interact for about 2 seconds, guard still asleep): nothing happens.
- Fast grab (tap Interact): the sleeping guard starts to stir. If you are still in the room
  after a few seconds, he wakes up and goes Alert.
- If a camera saw you take it, or the office guard was knocked out: SILENT ALARM. All guards
  go to Suspicious for the trip home.

## Stealth system

- Alert levels: Calm, Suspicious, Alert, Searching, then back to Calm.
  - Suspicious: a guard heard or glimpsed something and walks to check that spot.
  - Alert: you were clearly seen. Alarm, guards chase.
  - Searching: they lost you and hunt nearby hiding spots for a while, then calm down.
- Guard vision = flashlight cone. Show it clearly on screen.
- Noise: walking is quiet, running is loud, crouching is silent but slow. Show a noise ring
  in debug mode.
- Hide spots: lockers, laundry carts, under tables, under the desk, tool shelves, dark spots.
- Searching guards may check hiding spots near where they lost you.
- Knockout a guard from behind. Drag the body. Stuff it in a locker or cart.
- A guard who finds an unhidden body goes Alert.
- Cameras sweep back and forth. Being seen by one sends nearby guards to Suspicious.
- Guard patrols are the SAME every run, so players can learn and master them.

## Getting grabbed

- If a guard catches you during Alert, you get ONE chance per run to break free by mashing
  a button. Succeed and you stumble free. Get grabbed again and the run ends.

## Inmates

- Snitch inmates: small vision cones from their cells. If one sees you, they yell, and the
  nearest guard goes Suspicious and walks to that spot. Once you have the keycard, you can
  open their cell and knock them out.
- Trader inmate: bring him the cigarettes from the Mess Hall. He gives a hint about the vents,
  the camera panel, or the one-way drop (pick the one the player has not found yet).

## Bed check and dummy

- One bed check at a set time (when the timer hits 5:00 remaining). A guard checks your cell.
- Empty bed: Alert. You in bed: safe. Dummy in bed: guard walks on.
- Build the dummy from bedsheets found in the Laundry, then place it in your bed.

## Doors

- Some doors creak. Tap Up to open fast (loud, nearby guards hear it). Hold Up to open slowly
  (quiet, takes about 2 seconds).

## Map screen

- A simple map that fills in as you enter rooms, classic metroidvania style. Show doors,
  vents, and where you have been. Toggle with a button.

## End of run

- Win: back in your bed with the keycard when the timer hits 0:00 (or press a "Sleep" action
  in bed with the keycard to end early).
- Lose: grabbed a second time, or out of bed at headcount.
- Score screen: time left, times spotted, knockouts, bodies found by guards.
- Ranks:
  - Ghost: never spotted, no knockouts
  - Shadow: never spotted
  - Inmate: made it back
  - Caught: did not make it back
- "Play again" button.

## Controls (keyboard and controller both work, plus the browser Gamepad API standard mapping)

- Move: A/D or left stick
- Enter locker, door, vent, or open door (tap fast, hold slow): W or D-pad/stick Up
- Crouch: S or Down
- Run: Shift or Right Trigger
- Interact / pick up / grab keycard (tap fast, hold slow): E or A (bottom face button)
- Knockout / drag body: Space or X (left face button)
- Break free (mash): Space or X
- Map: M or Select/View
- Pause: Esc or Start

## Debug mode (toggle with a key like F1)

- Show vision cones, noise rings, guard state labels, patrol paths, timer controls.
- Lets Adam playtest and tune quickly.

## Playtest questions (ask Adam after each build)

1. Did hiding while a guard walked by feel tense?
2. Did the timer feel exciting, or just stressful?
3. Did the vent shortcut feel like a reward?
4. Did you want to play again to do it faster or cleaner?
