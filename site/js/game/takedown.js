// Takedowns. Get behind a guard who has not seen you and grab him. While you hold him you
// choose: knock him out, interrogate him, throw him down, or drag him somewhere better first.
// Hold him too long without choosing and he breaks free.
// Two more ways to knock a guard out: drop on him from above, or pull him into your hiding spot.
import { CONFIG } from './config.js';
import { raiseAlarm } from './alert.js';
import { reachable } from './guard.js';
import { isContainer, spotById } from './hiding.js';
import { knockOut, knockoutTarget } from './knockout.js';
import { say, sayAfter } from './messages.js';

export const heldGuard = (world) => (
  world.hold ? world.allGuards.find((guard) => guard.id === world.hold.guardId) : null
);

// A guard who has no idea you are there: not chasing, not looking at you, not already held.
const unaware = (guard) => (
  !guard.seesPlayer && guard.state !== 'alert' && guard.state !== 'held' && guard.state !== 'out'
);

// ---------- The grab ----------

// The guard a press of the button would grab right now (see knockoutTarget for the rule).
export const grabTarget = (world) => (world.hold ? null : knockoutTarget(world));

export function startHold(world, guard) {
  const { player } = world;
  // time: seconds held without choosing. asking: seconds of interrogation so far.
  world.hold = { guardId: guard.id, time: 0, asking: 0, talked: false };
  player.holding = guard.id;
  player.facing = Math.sign(guard.x - player.x) || player.facing;
  Object.assign(guard, {
    state: 'held', facing: player.facing, detection: 0, seesPlayer: false, stun: 0, hearing: 0, glance: 0,
    vault: null, stirTimer: 0,
  });
  world.events.push({ type: 'grabGuard', guardId: guard.id });
}

function letGoOf(world) {
  world.hold = null;
  world.player.holding = null;
}

// He ends up Alert: thrown down, let go, or broken free. kind says which, for the score screen.
function turnLoose(world, guard, kind, stun, cfg) {
  const { player } = world;
  letGoOf(world);
  guard.state = 'calm';
  raiseAlarm(world, player.x, 'sight', cfg.guard, guard.roomId, { kind, guard });
  guard.stun = stun;
  // Thrown down or let go he is in no state to chase at once. Broken free, he gets the usual
  // moment of shock like any guard who goes Alert.
  if (stun > 0) guard.react = 0;
}

function slam(world, guard, cfg) {
  const { player } = world;
  turnLoose(world, guard, 'slam', cfg.takedown.slamStunSeconds, cfg);
  guard.x = reachable(guard, guard.x, guard.x + player.facing * cfg.takedown.slamPushMetres);
  guard.hitAt = world.time;
  world.stats.slams += 1;
  world.pendingNoises.push({ x: player.x, y: player.y, radius: cfg.takedown.slamNoiseRadius });
  world.events.push({ type: 'slam', guardId: guard.id });
}

// What he says, and what it does. Every guard gives up his radio code. Each also has one thing
// of his own, set in rooms.js: his room's patrols, a secret, or a line about the mine.
function talk(world, guard, cfg) {
  const { hold } = world;
  const extra = guard.talk ?? { type: 'story', text: 'I just walk the beat. I do not know anything.' };
  hold.talked = true;
  hold.asking = 0;
  hold.time = 0;
  guard.interrogated = true;
  guard.codeKnown = true;
  world.stats.interrogations += 1;
  const line = extra.text ?? 'Same beat every night. Look, I will mark it for you.';
  let payoff = `He said: "${line}"`;
  if (extra.type === 'patrols') {
    const seconds = cfg.takedown.patrolRevealSeconds;
    world.patrolReveal = { roomId: guard.homeRoomId ?? guard.roomId, until: world.time + seconds };
    payoff = `Patrol reveal: the guard routes in this room are on your map (M) for ${seconds} seconds.`;
  } else if (extra.type === 'secret') {
    payoff = `Secret learned: ${line}`;
  }
  for (const id of extra.reveals ?? []) world.knownPortals.add(id);
  for (const id of extra.finds ?? []) world.found.add(id);
  world.intel.push({ from: guard.label ?? 'Guard', type: extra.type, text: line });
  // His words go up in a speech bubble over him. What you gained is spelled out in two
  // messages, one after the other.
  world.speech = { guardId: guard.id, text: line, until: world.time + cfg.takedown.speechSeconds };
  say(world, 'Radio code learned: his check-ins will be faked.', 4.5);
  sayAfter(world, payoff, cfg.hintSeconds);
  world.events.push({ type: 'talk', guardId: guard.id, talk: extra.type });
}

// The choices in the pop-up while you hold a guard, with the buttons for keyboard and
// controller. progress (0 to 1) is how far through an interrogation you are.
export function holdOptions(world, cfg = CONFIG.takedown) {
  const guard = heldGuard(world);
  if (!guard) return [];
  const { hold } = world;
  const options = [{ id: 'knockOut', keys: 'SPACE', pad: 'X', label: 'knock out' }];
  if (hold.talked) options.push({ id: 'letGo', keys: 'Q', pad: 'Y', label: 'let go (he raises the alarm)' });
  else if (guard.interrogated) {
    options.push({ id: 'interrogate', keys: '-', pad: '-', label: 'he has already talked' });
  } else {
    const progress = Math.min(1, hold.asking / cfg.interrogateSeconds);
    options.push({ id: 'interrogate', keys: 'Q', pad: 'Y', label: 'interrogate', progress });
  }
  options.push({ id: 'slam', keys: 'F', pad: 'LB', label: 'throw (loud)' });
  options.push({ id: 'drag', keys: 'A / D', pad: 'stick', label: 'drag: just move' });
  return options;
}

// 1 just after the grab (or after he talks), 0 when he is about to break free.
export function holdLeft(world, cfg = CONFIG.takedown) {
  return world.hold ? Math.max(0, 1 - world.hold.time / cfg.holdSeconds) : 0;
}

// True while an interrogation is under way: you cannot move.
export const interrogating = (world) => Boolean(world.hold) && world.hold.asking > 0 && !world.hold.talked;

// Keeps the held guard in your hands as you move. Called after the player has moved.
export function carryHeld(world, cfg = CONFIG) {
  const guard = heldGuard(world);
  if (!guard) return;
  const { player } = world;
  const room = world.layout.rooms[guard.roomId];
  guard.x = Math.max(0.3, Math.min(room.width - 0.3, player.x + player.facing * cfg.takedown.holdGap));
  guard.y = player.y ?? 0;
}

// Called every step while a guard is held. pressed is { action, ask, throw }: fresh presses.
// One press of Ask starts the interrogation. It runs by itself: no need to hold anything.
export function updateTakedown(world, intent, pressed, dt, cfg = CONFIG) {
  const { hold } = world;
  const guard = heldGuard(world);
  carryHeld(world, cfg);
  if (pressed.action) {
    letGoOf(world);
    knockOut(world, guard, 'choke');
    return;
  }
  if (pressed.throw) {
    slam(world, guard, cfg);
    return;
  }
  if (hold.talked && pressed.ask) {
    turnLoose(world, guard, 'letGo', cfg.takedown.releaseStunSeconds, cfg);
    world.events.push({ type: 'letGo', guardId: guard.id });
    return;
  }
  if (!hold.talked && !guard.interrogated && hold.asking <= 0 && pressed.ask) {
    hold.asking = dt;
    world.events.push({ type: 'ask', guardId: guard.id });
    return;
  }
  if (hold.asking > 0 && !hold.talked) {
    // The clock on him breaking free stops while he is talking.
    hold.asking += dt;
    if (hold.asking >= cfg.takedown.interrogateSeconds) talk(world, guard, cfg);
    return;
  }
  hold.time += dt;
  if (hold.time < cfg.takedown.holdSeconds) return;
  turnLoose(world, guard, 'brokeFree', 0, cfg);
  say(world, 'He breaks free!');
  world.events.push({ type: 'brokeFree', guardId: guard.id });
}

// The player was grabbed by another guard while holding one: the held one is loose and Alert.
export function dropHeldGuard(world, cfg = CONFIG) {
  const guard = heldGuard(world);
  if (!guard) return;
  letGoOf(world);
  guard.state = 'alert';
  guard.react = cfg.guard.reactSeconds;
  guard.lastKnownX = world.player.x;
}

// ---------- From above ----------

// An unaware guard right under the ledge or platform you are standing on.
export function dropTarget(world, cfg = CONFIG.takedown) {
  const { player } = world;
  if (world.hold || player.hiddenIn || player.dragging || !player.onGround) return null;
  return world.guards.find((guard) => {
    const drop = (player.y ?? 0) - (guard.y ?? 0);
    return unaware(guard) && !guard.hiddenIn && drop >= cfg.aboveMinDrop && drop <= cfg.aboveMaxDrop
      && Math.abs(guard.x - player.x) <= cfg.aboveReach;
  }) ?? null;
}

export function dropOn(world, guard, cfg = CONFIG) {
  const { player } = world;
  Object.assign(player, {
    x: guard.x, y: guard.y ?? 0, vy: 0, onGround: true, jumping: false, dropping: null, landedAt: world.time,
  });
  // Landing makes a small noise.
  world.pendingNoises.push({ x: player.x, y: player.y, radius: cfg.noise.landRadius, amount: cfg.noise.smallAmount });
  world.events.push({ type: 'land' });
  knockOut(world, guard, 'above');
}

// ---------- From a hiding spot ----------

// An unaware guard passing within reach of the locker, cart, or table you are hidden in.
export function pullInTarget(world, cfg = CONFIG.takedown) {
  const { player, room } = world;
  if (world.hold || !player.hiddenIn) return null;
  const spot = spotById(room.hideSpots ?? [], player.hiddenIn);
  if (!spot || !isContainer(spot) || spot.type === 'bed') return null;
  return world.guards.find((guard) => (
    unaware(guard) && guard.state !== 'asleep' && !guard.hiddenIn && guard.knownSpotId !== spot.id
      && Math.abs(guard.x - player.x) <= cfg.pullInReach && Math.abs((guard.y ?? 0) - (spot.y ?? 0)) <= 0.3
  )) ?? null;
}

// He is knocked out and stored in the spot. It is full now, so you step out.
export function pullIn(world, guard) {
  const { player, room } = world;
  const spot = spotById(room.hideSpots ?? [], player.hiddenIn);
  knockOut(world, guard, 'pullIn');
  guard.hiddenIn = spot.id;
  guard.x = spot.x;
  player.hiddenIn = null;
  world.events.push({ type: 'stuff', guardId: guard.id });
}
