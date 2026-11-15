// Knocked-out guards: who can be grabbed, dragging the body, stuffing it in a locker or cart,
// and waking up. The grab itself and its choices are in takedown.js.
// Sneak up unseen and you can grab him. Knocked-out guards wake up again after a while.
// A guard who can see you cannot be knocked out: the same button shoves him instead (shove.js).
import { CONFIG } from './config.js';
import { beginSearch, makeSuspicious } from './alert.js';
import { isAwake, isConscious } from './guard.js';
import { nearestHideSpot, spotById } from './hiding.js';
import { say } from './messages.js';
import { shove, shoveReady, shoveTarget } from './shove.js';
import { knockOutSnitch } from './snitch.js';

// Ids of hiding spots that already hold a body. A full spot cannot hide the player.
export function fullSpotIds(world) {
  return world.allGuards.filter((guard) => guard.hiddenIn).map((guard) => guard.hiddenIn);
}

// A guard you could knock out right now: close, facing away, not looking at you, and not Alert.
// A sleeping guard can be knocked out from either side.
export function knockoutTarget(world, cfg = CONFIG.knockout) {
  const { player } = world;
  if (player.hiddenIn || player.dragging) return null;
  return world.guards.find((guard) => {
    const offset = player.x - guard.x;
    // You have to be standing on his level.
    if (Math.abs((player.y ?? 0) - (guard.y ?? 0)) > cfg.reachUp) return false;
    const behind = offset * guard.facing < 0 || guard.state === 'asleep';
    const unaware = !guard.seesPlayer && guard.state !== 'alert';
    return isConscious(guard) && guard.state !== 'held' && behind && unaware && Math.abs(offset) <= cfg.reach;
  }) ?? null;
}

// A body lying in the open that you could start dragging.
export function dragTarget(world, cfg = CONFIG.knockout) {
  const { player } = world;
  if (player.hiddenIn || player.dragging) return null;
  return world.guards.find((guard) => (
    guard.state === 'out' && !guard.hiddenIn && Math.abs(guard.x - player.x) <= cfg.reach
      && Math.abs((player.y ?? 0) - (guard.y ?? 0)) <= cfg.reachUp
  )) ?? null;
}

// The locker or cart you could stuff the dragged body into.
export function stuffTarget(world) {
  if (!world.player.dragging) return null;
  return nearestHideSpot(world.player, world.room.hideSpots, fullSpotIds(world));
}

// how is 'choke' (grabbed from behind), 'above' (dropped on), or 'pullIn' (from a hiding spot).
export function knockOut(world, guard, how = 'choke') {
  world.stats.takedowns[how] += 1;
  guard.state = 'out';
  guard.vault = null;
  guard.detection = 0;
  guard.seesPlayer = false;
  guard.stun = 0;
  // How long he has been out, and the moment it happened (for the hit flash and the fall).
  guard.outFor = 0;
  guard.outAt = world.time;
  guard.wakeWarned = false;
  world.stats.knockouts += 1;
  world.events.push({ type: 'knockout', guardId: guard.id });
  // A tower guard works a searchlight. With him down it goes dark, for the rest of the run.
  for (const light of world.cameras) {
    if (light.guardId !== guard.id || light.off) continue;
    light.off = true;
    light.sees = false;
    world.events.push({ type: 'lightOut', cameraId: light.id });
    say(world, 'His searchlight goes dark.');
  }
}

// True while the "shove not ready" shake should show over a guard.
export const tooRiskyNow = (world) => Boolean(world.risky) && world.time < world.risky.until;

// The Takedown / Drag button, when no guard is being held. Returns what happened, or null.
// take has the takedown moves (see takedown.js), passed in so the two files do not import
// each other in a circle.
export function pressAction(world, take) {
  const { player } = world;
  if (player.dragging) {
    player.dragging = null;
    return 'dropped';
  }
  const passing = take.pullInTarget(world);
  if (passing) {
    take.pullIn(world, passing);
    return 'pullIn';
  }
  const guard = knockoutTarget(world);
  if (guard) {
    take.startHold(world, guard);
    return 'grab';
  }
  const below = take.dropTarget(world);
  if (below) {
    take.dropOn(world, below);
    return 'above';
  }
  if (knockOutSnitch(world)) return 'knockout';
  // He can see you, or is in front of you: no knockout. A shove instead, if it is ready.
  const awake = shoveTarget(world);
  if (awake && shoveReady(world)) {
    shove(world, awake);
    return 'shove';
  }
  if (awake) {
    world.risky = { guardId: awake.id, until: world.time + CONFIG.knockout.riskySeconds };
    world.events.push({ type: 'tooRisky', guardId: awake.id });
    return 'notReady';
  }
  const body = dragTarget(world);
  if (body) {
    player.dragging = body.id;
    return 'dragging';
  }
  return null;
}

// Up while dragging: put the body in the hiding spot you are standing at.
export function stuffBody(world) {
  const spot = stuffTarget(world);
  if (!spot) return false;
  const body = world.guards.find((guard) => guard.id === world.player.dragging);
  body.hiddenIn = spot.id;
  body.x = spot.x;
  world.player.dragging = null;
  world.events.push({ type: 'stuff', guardId: body.id });
  return true;
}

// The dragged body trails just behind the player.
export function updateDrag(world) {
  const { player } = world;
  if (!player.dragging) return;
  const body = world.allGuards.find((guard) => guard.id === player.dragging);
  body.x = player.x - player.facing * 0.7;
  body.y = player.y ?? 0;
}

// ---------- Waking up ----------

const roomOf = (world, guard) => world.layout.rooms[guard.roomId];

// 0 to 1: how close a knocked-out guard is to being back on his feet.
export function wakeProgress(guard, cfg = CONFIG.knockout) {
  const total = cfg.wakeSeconds + (guard.hiddenIn ? cfg.bangSeconds : 0);
  return Math.min(1, (guard.outFor ?? 0) / total);
}

function wake(world, guard, cfg) {
  if (world.player.dragging === guard.id) world.player.dragging = null;
  guard.hiddenIn = null;
  guard.bodyFound = false;
  guard.outFor = 0;
  guard.wakeWarned = false;
  // He searches around where he woke up, and stays on edge for the rest of the run.
  guard.wary = true;
  guard.lastKnownX = guard.x;
  guard.state = 'calm';
  world.events.push({ type: 'wake', guardId: guard.id, roomId: guard.roomId });
  beginSearch(world, guard, cfg.guard);
}

// A guard shut in a locker or cart bangs on it. Guards in that room who can hear come to look.
function bang(world, guard, cfg) {
  world.events.push({ type: 'bang', guardId: guard.id, roomId: guard.roomId });
  for (const other of world.allGuards) {
    if (other.roomId !== guard.roomId || !isAwake(other)) continue;
    if (Math.abs(other.x - guard.x) <= cfg.knockout.bangRadius) makeSuspicious(world, other, guard.x);
  }
}

// Called every step, for every knocked-out guard in the prison.
export function updateKnockedOut(world, dt, cfg = CONFIG) {
  const k = cfg.knockout;
  for (const guard of world.allGuards) {
    if (guard.state !== 'out') continue;
    const before = guard.outFor ?? 0;
    guard.outFor = before + dt;
    const room = roomOf(world, guard).name;
    if (!guard.hiddenIn) {
      if (!guard.wakeWarned && guard.outFor >= k.wakeSeconds - k.wakeWarningSeconds) {
        guard.wakeWarned = true;
        world.events.push({ type: 'stir', guardId: guard.id });
        say(world, `The guard you knocked out in the ${room} is starting to stir.`);
      }
      if (guard.outFor >= k.wakeSeconds) wake(world, guard, cfg);
      continue;
    }
    if (guard.outFor < k.wakeSeconds) continue;
    if (!guard.wakeWarned) {
      guard.wakeWarned = true;
      const spot = spotById(roomOf(world, guard).hideSpots ?? [], guard.hiddenIn);
      say(world, `Banging from inside a ${spot?.type ?? 'locker'} in the ${room}. A guard is waking up.`);
    }
    const since = guard.outFor - k.wakeSeconds;
    const beat = (seconds) => Math.floor(Math.max(0, seconds) / k.bangEverySeconds);
    if (since >= k.bangSeconds) wake(world, guard, cfg);
    else if (before < k.wakeSeconds || beat(since) !== beat(before - k.wakeSeconds)) bang(world, guard, cfg);
  }
}
