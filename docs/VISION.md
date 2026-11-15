# Carter Island: Vision

Placeholder title. This file says what the full game is trying to be. Every feature should
serve at least one pillar below. docs/DESIGN.md says how the current prototype works; this
file says where it is going.

## The game in one line

A stealth game you master like a Souls game: every area is a puzzle with many answers, the
world loops back on itself, every guard type has its own patrol style to learn, and expert
players can fly through it like a ninja platformer.

## The setting (short)

- An island prison run by a company, built on an old fortress, over a deep mine.
- Layers, top to bottom: corporate surface, cell blocks, old fortress, mine, surreal deep.
- Under it all is an oily black stone. The company calls it Ore Seven (the first piece is
  Sample O-1). Inmates call it The Black (miners call it Tar Rock). Near it, things feel
  wrong. It is never fully explained.
- The hero gets locked up on purpose to find someone close to them: an ex-company insider who
  was framed and sent here.

## Pillar 1: Every area is a puzzle with many answers

Every area should have at least four good ways through, from this list:

- Sneak: timing, shadows, hiding spots.
- Tools: vents, throwables, panels, contraband.
- People: interrogations, the trader, inmates, snitches, disguises.
- Movement: ledges, slide, dash, later the grapple hook.
- Force: takedowns, shoves, chases. Always risky (see "Heat" below for what that means).

Rules:
- The central question for every encounter: "What interesting decision does this ask the
  player to make?" Adding guards, abilities, or punishments only helps if it improves that
  decision.
- Each answer must be GOOD, not just possible. Fewer strong answers beat many weak ones.
- Answers must FEEL different: different advantages, costs, and risks. If every method takes
  the same time and has the same consequences, the choice is cosmetic.
- "Four answers" applies to a substantial encounter or connected area, not every hallway.
- Players should see reasons to WANT each route, not just know it is possible.

Example encounter (a future checkpoint: reach a locked door past a guard and a camera):

| Approach | Decision | Advantage | Cost or risk |
| --- | --- | --- | --- |
| Sneak | Wait for the sweep, crawl behind cover | Saves supplies, no heat | Patience and timing |
| Tools | Spend a distraction to move the guard | Predictable opening | Uses limited contraband |
| People | Use an access code learned by interrogation | Rewards preparation | Must find that chance |
| Movement | Take a narrow upper route | Fast, saves supplies | Exposed jumps, noisy landings |
| Force | Stun or disable the guard | Opens the direct route | Noise, discovery, security response |

## Stealth is the dependable baseline

- A player who understands hiding, patrols, and detection can always progress without
  mastering hard jumps. Optional challenges (like reaching movement gear) may demand platforming.
- Every area needs places to OBSERVE, WAIT, and RECOVER: enter, stand somewhere safe,
  understand the threat, form a plan.
- Expert movement offers shortcuts through the SAME encounter. Example: a beginner waits in a
  locker; an experienced player follows behind the guard; an expert jumps to the pipe, drops
  behind him, and exits during the camera's turn.

## Heat (what "risky" means)

Heat must change the player's NEXT DECISION, not just raise a number or make every guard
faster. Three different kinds of consequence:
- Witnessed violence (a shove, a seen takedown): immediate response.
- Hidden takedown (unseen pull-in or grab): delayed risk only, through missed radio calls,
  body discovery, or the guard waking up. Nobody else knows yet. The prison is not all-knowing.
- Escaping a chase (for example through doors): security pressure rises by clear, shown rules
  (the heat ladder).

## Pillar 2: Souls-like mastery (hard, fair, learnable)

- Capture teaches. After every capture the player should know what they did wrong. The score
  screen says how and why.
- Patrols and guard behavior are learnable. No hidden randomness that punishes learning.
- The world loops back on itself. Shortcuts (like the one-way drop) open as you progress, so
  the prison gets faster to move through as you master it.
- Lore comes in pieces: interrogation lines, notes, graffiti, overheard radio. The Black is
  only ever hinted at.
- Big set-piece encounters (Metal Gear style bosses), each testing a different skill: for
  example the Warden, the Dog Handler, the Tower Sniper, the Camera Room Chief.

### Checkpoints ("bonfires")

- Main checkpoints: SAFE ROOMS you unlock across the prison (hidden stashes, forgotten
  storerooms, old fortress cells). Reaching one saves progress and lets you change your build.
- Feature: INMATE HIDEOUTS. Some inmates will hide you. They work like a checkpoint, but if
  your heat is high they may sell you out instead.

### Getting caught (the "death")

- You go to SOLITARY, lose time, and wake up back at your last safe room or cell.
- You KEEP permanent unlocks (screwdriver, boots, and other key tools).
- Your carried CONTRABAND is dropped at the spot where you were caught. Go back and pick it up
  (Souls style). Get caught again before you reach it and it is gone (returned to where it
  was found, or confiscated).
- Guards stay on edge after a capture.

## Pillar 3: Builds (play your way)

Both systems:

- POCKETS: a small number of contraband slots (for example 3). Items like soap, a lockpick,
  a mirror, a smoke bomb, cigarettes for trading. Like Hollow Knight charms: you choose what
  to carry, and changing it happens at a safe room.
- SKILL BRANCHES, grown over the game:
  - Shadow (stealth): quieter steps, faster crouch, longer hiding.
  - Brawler (force): faster takedowns, stronger shove, break free easier.
  - Fixer (people): better trades, longer disguises, more from interrogations.
  - Runner (movement): longer dash, better air control, wall moves.
- Different builds should make different answers easier in the SAME area.
- Builds change preferences; they never repair broken basics. Shove must already feel useful
  before a Brawler upgrade, and sneaking must already feel responsive before a Shadow upgrade.
  The player should think "this suits how I play", never "now the controls finally work".

## Metroidvania: unlocks change familiar places

- Unlocks (screwdriver, boots, grapple) should make the player RETHINK places they know, not
  just open one isolated door. Example: first visit, carefully cross the Yard; with boots,
  cross the exposed roof gap; with the grapple, link two upper routes and skip a long return.
- Shortcuts should remove travel the player has already mastered, while keeping the
  interesting encounters ahead. That makes backtracking satisfying, not repetitive.

## Pillar 4: Guards you learn (a roster of patrol styles)

Adaptive AI is ON HOLD. A Souls-like needs a system the player can learn, so guards do not
change their habits to counter the player. Instead the game has a full ROSTER of guard types,
each with a different, learnable patrol style. Mixing them is how areas become puzzles.

Starting roster ideas (to be picked, cut, and tested one at a time):

| Guard type | Patrol style | How you beat him |
| --- | --- | --- |
| Walker | Back and forth on a fixed line | Timing, hiding as he passes |
| Sentry | Stands still, turns on a beat | Move on his turn, cover, dark spots |
| Sleeper | Asleep at a post, wakes to noise | Silence, quiet grabs |
| Rover | Long loop through several rooms | Track his loop on the map, wait him out |
| Sweeper | Stops and sweeps his flashlight around | Read the sweep, use cover |
| Pair | Two guards, the back one checks behind | Split them with a lure, or avoid |
| Veteran | Checks hiding spots on his route | Do not hide on his route, use height |
| Lazy guard | Sits, distracted, only reacts to loud noise | Sneak past, but do not make noise |
| Radio operator | Stationary hub for check-ins | Knock him out and check-ins go silent (suspicious) |
| Catwalk spotter | Looks DOWN from above | Stay under cover, go high yourself |
| Dog handler | His dog follows your scent trail | Water, laundry, vents break the trail |
| Tower guard | Searchlight on a fixed sweep | Learn the sweep, use shadows |
| Trustee | An inmate who walks around and snitches | Avoid, bribe, or knock out |

## Pillar 5: Movement is for mastery, not a must

- A normal player can ALWAYS finish an area by sneaking.
- Pros use jump, slide, dash, and later the grapple to skip ahead and take risky lines.
- Fast movement must stay RISKY (noise, being seen, heat) so it never replaces stealth.
  (See the Codex review: running and slide spam were dominant until fixed.)
- Time trials and ranks per area give speedrunners something to chase.
- The test for speed: a skilled player moving fast is SUCCESS. A player ignoring every guard
  without making decisions is a BALANCE PROBLEM. Judge fast routes by the timing, preparation,
  and risk they require, not by speed alone.

## Force has a place, with a price

- Stealth, movement, tools, and force all need satisfying answers, with different risks.
- Force must always be a CHOICE, never an accident (for example, shove has its own button).
- Force should have useful follow-ups (stun, then grab) and reward positioning (ledge
  knock-offs), but noise and heat keep it costly, so quiet takedowns and pull-ins stay
  worthwhile.

## For reviewers

- Safe rooms, builds, and the full guard roster are FUTURE DIRECTION, not missing features in
  today's prototype. Review the prototype against what it is trying to prove right now.

## Guardrails (what we protect)

- The core feeling: hiding while a guard walks by must stay tense.
- What the player SEES must always match what the game CHECKS.
- Guards always warn before they react (meters, "?", "!", reaction pause, lunge tell).
- Prove one pillar at a time in the prototype before building it big.

## Next proof: one excellent area (the Yard)

Use the Yard and its connected routes to answer:
1. Can a cautious player understand it and get through?
2. Can an expert take a faster, more demanding route?
3. Does deliberate force give a satisfying alternative?
4. After a capture, can the player explain the mistake and name what they will try next?
5. On another run, do players CHOOSE a different approach on their own?

## Decided so far

- Genre: stealth prison-escape metroidvania, Metal Gear meets metroidvania, Souls-like mastery.
- View: 2.5D side view, smart camera.
- Movement feel: Mega Man X and Hollow Knight (jump 1.5 m, dash 4.5 m).
- Inspirations: Metal Gear (original and V), Tenchu, Mark of the Ninja, Hollow Knight,
  Symphony of the Night, Mega Man X, Hitman, Splinter Cell, Dark Souls.
- On hold: adaptive AI, shadow powers (Shikamaru-style), the full story.
