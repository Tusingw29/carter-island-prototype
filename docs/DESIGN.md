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

## Shove (added in Step 10)

- Press Space/X while facing a guard who can see you (front, or during a chase): a quick
  shove that stuns him for about 1.5 s (config value). He staggers back.
- It is LOUD (about the same as running) and counts as being spotted if you were not
  already. It also sets off the Alert if he was not already Alert.
- Cooldown of about 8 s (config value), shown as a small meter.
- Same hit feedback as knockouts, but lighter (smaller shake, no "Zz").
- Knockout from behind, unseen, stays the same (instant).

## Throwables (added in Step 10)

- Small items lying around: cups in the Mess Hall, soap in the Laundry, a few elsewhere.
  Pick up with E. Carry one at a time. Show it in the corner of the screen.
- Throw with F (keyboard) and Left Bumper (controller). It flies in a short arc in the
  direction you face. Hold to see the arc before letting go.
- Hit a guard's head: he is stunned for about 1.5 s and goes Suspicious, looking
  toward where it came from.
- Miss: it lands and makes a noise at the landing spot. Calm guards in earshot go
  Suspicious and walk to THAT spot. This is a lure for sneaking past (Metal Gear style).
- Items respawn in their spot when a new run starts, not during a run.

## Line of sight (added in Step 10)

- Solid props (crates, walls, shelves, counters, lockers, doors, tables if tall
  enough) block line of sight. Check sight from the guard's flashlight to at least two
  points on the player (head and chest). If both are blocked, he cannot see you.
- Low cover only hides you when crouching behind it. Tall cover hides you standing.
- Draw the vision cone CLIPPED by obstacles, so the player can see the safe shadow
  behind each crate.
- Cameras follow the same rule.

## The Yard (added in Step 11)

Add the first new area built for the platforming movement: THE YARD. It tests two things
at once: does Mega Man X style movement work inside the stealth game, and does the loop
hold up when the world grows?

### Movement in the main game

- From now on, JUMP and SLIDE are available from the start of every run (main game).
  Use the gym values locked in Step 10.
- DASH is a metroidvania unlock: you only have it after picking up the WORK BOOTS in the
  Yard's equipment shed (see below). The gym keeps all moves for testing.
- Jumping and landing make a small noise. Dash is LOUD. Slide is quiet.
- Rooms can now have platforms and ledges you stand on, plus ladders (hold Up/Down to
  climb). Add what the engine needs for this, with tests.
- Keep main-game running and walking exactly as they are.

### The Yard: layout (night, lights out)

```
                 [TOWER 1]                          [TOWER 2]
                  searchlight                        searchlight
                      |                                  |
 ROOF      ...[Guard Office window]=====(roof ledge)======|
                      |                                  |
 GROUND    [Mess Hall]--[ Court + bleachers ]--[ fence ]--[ Equipment shed ]--[ OUTER WALL ]
              side door      hoops, cover       climb       work boots           too high
```

- Entrance: a new side door from the Mess Hall into the Yard (creaky).
- Basketball court: bleachers you can hide UNDER and climb ON TOP of. Hoops and poles to
  jump from. Mostly open ground, so you must time the searchlights.
- Throwable: a BASKETBALL on the court. Thrown, it bounces and is LOUDER than a cup, so it
  is a big lure.
- Chain-link fences (see climbing below).
- Two guard towers, each with a ladder, a guard on top, and a searchlight.
- One ground guard patrolling the court.
- Roof ledge: a new route along the roof to the GUARD OFFICE WINDOW. Getting from the tower
  platform to the roof needs a jump; crossing the gap to the window needs the DASH. The
  window works both ways (in from the roof, out to the roof).
- Equipment shed: the WORK BOOTS (dash unlock) are inside, reached through a roof hatch.
  Getting to the hatch is a JUMP CHALLENGE using crates, the fence top, and the bleachers.
  Doable with jump only.
- Outer wall at the far end: too high to climb. Message: "Too high. You'll need something to
  get over this." (Teaser for the grapple hook later. Like the welded vent.)

### What the Yard is for in a run (both)

- A new route to the Guard Office: Mess Hall, Yard, tower, roof, dash across, window.
  Fast but exposed.
- Where you get the dash (work boots), plus optional items (the basketball).

### Fence climbing (both ways)

- Jump over the LOW parts of fences fast.
- Or climb any part of the chain-link by holding Up: slow, and you are exposed while
  climbing (no hiding, easy to see).

### Searchlights (timed pools of light)

- Each searchlight is a pool of light on the ground that sweeps on a fixed path and fixed
  timing (same every run), so players can learn when to cross.
- Stepping into a pool works like being seen by a camera: the tower guard calls it in,
  nearby guards go Suspicious and walk over, and it counts as spotted.
- Solid cover blocks the light (use the Step 10 line-of-sight rules): the bleachers and the
  shed cast safe shadows.
- Show the pool clearly on the ground, with a little warning glow just before it arrives.
- Knocking out a tower guard (climb the ladder, sneak up behind him) stops his searchlight
  for the rest of the run. He is on the radio check-in schedule like everyone else.

### Connections and map

- Add the Yard, the towers, the roof ledge, and the Guard Office window to the map screen.
  The window and the roof route only show once discovered.
- Keep the 7:00 timer for now.

## Searchlights and solid props (rules added in Step 12)

- Make the visible light and the detection area EXACTLY the same shape, from one shared
  function used by both the renderer and the game logic.
- Draw the light POOL on the ground (and on platforms it hits), not just a beam in the
  air. Add the warning glow just before a pool arrives.
- Height: the light hits whatever it actually reaches. If you are up on a platform, it
  checks your real position, and cover between the tower and you blocks it (Step 10
  line-of-sight rules).
- A debug view (F1) outlines each searchlight's detection area.
- Guards must respect solid props. Low crates: the guard VAULTS over (about 0.8 s, slow,
  clear animation), which gives the player time. Tall crates and walls: he cannot pass
  and must stop or take another way.
- No patrol walks through anything.

## Quieter sneaking (added in Step 12)

- Walking noise radius drops to about 1 m (config value). Running stays loud.
- Hearing meter: noise fills a meter instead of making a guard Suspicious at once.
  - Partly full: he glances back over his shoulder for a moment, then keeps patrolling.
  - Full: he goes Suspicious and walks to the sound.
  - It drains when you go quiet. Show it as a small arc over the guard.
- Crouch-walking stays silent but is faster (about 70% of walking speed, config value).
- Noise rings are always visible as a faint circle around the player (not only in debug),
  so the player knows how loud they are.

## The takedown system (added in Step 12)

Replaces the old instant knockout from behind. The shove (from the front) and throwables stay.

### Grab

- Get close behind a guard who cannot see you (or a sleeping one): the prompt
  "SPACE: grab" appears. Press it: you grab him from behind. He cannot call out.
- While holding him, the options show on screen:
  - KNOCK OUT (Space / X again): quick choke, he goes down. Same as before: wakes after
    75 s, misses radio check-ins. Hit feedback from Step 8.
  - INTERROGATE (hold E / A for about 3 s): he talks (see below), then you still choose to
    knock him out or let him go. You cannot move while interrogating. If another guard
    sees you, he goes Alert.
  - THROW (F / Left Bumper): slam him to the floor. Stunned about 2 s, LOUD, then he gets up
    Alert. Use it to escape.
  - DRAG (move while holding): walk him slowly to a better spot, then pick an option.
- If you hold him for more than about 6 s without choosing, he breaks free and goes Alert.
- Controller layout must not clash with existing buttons. Show the button hints on screen.

### What interrogating gets you (all four)

- Every interrogation gives his RADIO CODE: after you knock him out, his radio check-ins
  are answered (faked) until he wakes up, so nobody comes looking. Show "Check-in faked"
  when it happens.
- Plus ONE extra, set per guard in rooms.js (same every run, so it is learnable):
  - PATROL REVEAL: the guard routes in this room show on the map for 60 s.
  - A SECRET: where something is (the work boots, a vent, a throwable, the camera panel).
  - A STORY BIT: a short, uneasy line about The Black / Ore Seven. Never explain it. Hints
    only. Examples of the tone: "Don't go near the deep shafts. Guys come back quiet.",
    "Company calls it Ore Seven. Miners call it The Black. Nobody calls it safe.",
    "Lights flicker near the old wall. Every night. Same time."
- Each guard can only be interrogated once per run.

### Extra takedowns

- FROM ABOVE: stand on a ledge or platform over an unaware guard and press Space to drop on
  him: instant knockout. Landing makes a small noise.
- FROM A HIDING SPOT: while hidden in a locker, cart, or under a table, if an unaware guard
  passes within reach, the prompt "SPACE: pull in" appears. He is knocked out and stored in
  that spot (the spot is then full, and you step out).

### Score screen

- Add: takedowns by type, interrogations, check-ins faked.

## Readable stealth (added in Step 13)

Adam studied Mark of the Ninja (Klei, 2012), the closest game to Carter Island. Its lead
designer's rules include: show the stealth rules on screen, warn before enemies react, and
do not punish failure so hard that players replay long stretches.

### Lit or hidden, at a glance

- The player's look must always show whether a guard, camera, or searchlight COULD see them
  right now, using the exact same visibility check as the game logic (one shared function):
  - Hidden (in a dark spot, in shadow behind cover, inside a hiding spot, or out of every
    light): the player turns into a dark silhouette with a thin outline.
  - Visible (in any flashlight cone, camera view, or searchlight pool, or in a lit area):
    full color, with a soft glow.
- Switch instantly, no fade, so it reads like a clear yes or no.
- Add lit areas where it makes sense (under a lamp, near the guard office desk light) and
  make sure dark areas match what the player sees on screen.

### "Last seen" marker

- When a guard loses sight of the player during Alert or Searching, show a faint ghost
  outline of the player at the spot the guard THINKS they are (his last known position).
- One marker per guard who is hunting. It fades when that guard calms down.
- If the guard moves his search to a new spot (for example he heard a noise), the marker
  moves too, so the player always knows what the guards believe.

### Solitary instead of restarting (softer failure)

- The FIRST time the player is caught (grabbed and fails the break-free, or grabbed a second
  time), the run does NOT end. Instead:
  - Short fade to black, "SOLITARY" on screen.
  - The timer loses 60 seconds (config value), shown clearly as a time penalty.
  - The player wakes up in a new small SOLITARY CELL room next to the Cell Block. After a
    few seconds a guard opens the door and the player is walked back to their own cell
    (skip-able), and placed in bed.
  - The keycard is taken back and returned to the Guard Office desk.
  - Carried throwables are taken. Unlocks you have earned (screwdriver, work boots) are
    KEPT, because losing them would feel unfair.
  - Every guard stays wary (Suspicious level) for the rest of the run.
  - The break-free chance resets, so the player again gets one mash-to-escape.
- The SECOND time the player is caught, the run ends (Caught), as now.
- Score screen: show "Solitary: yes/no" and the time lost. A run with a solitary trip can
  still win, but can only be ranked Inmate.
- Add the solitary cell to the map screen once visited.

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
