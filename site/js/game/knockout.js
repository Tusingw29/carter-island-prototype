// Knocking guards out from behind, dragging the body, and stuffing it in a locker or cart.
// An awake guard takes a choke hold: hold the button until he goes limp. Knocked-out guards
// wake up again after a while.
import { CONFIG } from './config.js';
import { beginSearch, makeSuspicious, raiseAlarm } from './alert.js';
import { isAwake, isConscious } from './guard.js';
import { nearestHideSpot, spotById } from './hiding.js';
import { say } from './messages.js';
import { knockOutSnitch } from './snitch.js';

// Ids of hiding spots that already hold a body. A full spot cannot hide the player.
export function fullSpotIds(world) {
  return world.allGuards.filter((guard) => guard.hiddenIn).map((guard) => guard.hiddenIn);
}

// A guard you could knock out right now: close, facing away, and not looking at you.
// A sleeping guard can be knocked out from either side.
export function knockoutTarget(world, cfg = CONFIG.knockout) {
  const { player } = world;
  if (player.hiddenIn || player.dragging || world.choke || (player.y ?? 0) > cfg.reachUp) return null;
  return world.guards.find((guard) => {
    const offset = player.x - guard.x;
    const behind = offset * guard.facing < 0 || guard.state === 'asleep';
    return isConscious(guard) && behind && Math.abs(offset) <= cfg.reach && !guard.seesPlayer;
  }) ?? null;
}

// A body lying in the open that you could start dragging.
export function dragTarget(world, cfg = CONFIG.knockout) {
  const { player } = world;
  if (player.hiddenIn || player.dragging) return null;
  return world.guards.find((guard) => (
    guard.state === 'out' && !guard.hiddenIn && Math.abs(guard.x - player.x) <= cfg.reach
  )) ?? null;
}

// The locker or cart you could stuff the dragged body into.
export function stuffTarget(world) {
  if (!world.player.dragging) return null;
  return nearestHideSpot(world.player, world.room.hideSpots, fullSpotIds(world));
}

export function knockOut(world, guard) {
  guard.state = 'out';
  guard.detection = 0;
  guard.seesPlayer = false;
  guard.stun = 0;
  guard.held = false;
  // How long he has been out, and the moment it happened (for the hit flash and the fall).
  guard.outFor = 0;
  guard.outAt = world.time;
  guard.wakeWarned = false;
  world.stats.knockouts += 1;
  world.events.push({ type: 'knockout', guardId: guard.id });
}

// ---------- The choke hold ----------

function startChoke(world, guard) {
  world.choke = { guardId: guard.id, time: 0 };
  guard.held = true;
  world.events.push({ type: 'chokeStart', guardId: guard.id });
}

// Lets go without finishing. The guard is free and knows exactly where you are.
export function breakChoke(world, cfg = CONFIG) {
  const guard = world.allGuards.find((entry) => entry.id === world.choke.guardId);
  world.choke = null;
  if (!guard || guard.state === 'out') return;
  guard.held = false;
  guard.facing = Math.sign(world.player.x - guard.x) || guard.facing;
  world.events.push({ type: 'chokeBroken', guardId: guard.id });
  raiseAlarm(world, world.player.x, 'sight', cfg.guard);
}

// Runs every step while a guard is held. held is true while the button is down.
export function updateChoke(world, held, dt, cfg = CONFIG) {
  if (!held) {
    breakChoke(world, cfg);
    return;
  }
  world.choke.time += dt;
  if (world.choke.time < cfg.knockout.chokeSeconds) return;
  const guard = world.allGuards.find((entry) => entry.id === world.choke.guardId);
  world.choke = null;
  knockOut(world, guard);
}

// 0 to 1 while a choke hold is going on. Otherwise null.
export function chokeProgress(world, cfg = CONFIG.knockout) {
  return world.choke ? Math.min(1, world.choke.time / cfg.chokeSeconds) : null;
}

// The Knockout / Drag button. Returns what happened, or null.
export function pressAction(world) {
  const { player } = world;
  if (player.dragging) {
    player.dragging = null;
    return 'dropped';
  }
  const guard = knockoutTarget(world);
  if (guard) {
    // A sleeping guard goes down with a quick tap. An awake one has to be held.
    if (guard.state === 'asleep') {
      knockOut(world, guard);
      return 'knockout';
    }
    startChoke(world, guard);
    return 'choke';
  }
  if (knockOutSnitch(world)) return 'knockout';
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
    if (other.roomId !== guard.roomId || !isAwake(other) || other.held) continue;
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
