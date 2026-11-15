// Radio check-ins. Every guard on patrol calls in on a fixed beat, the same every run.
// If one does not answer because he is knocked out, another guard goes to his post to look.
import { CONFIG } from './config.js';
import { makeSuspicious } from './alert.js';
import { isAwake, moveToward, obstaclesFor } from './guard.js';
import { say } from './messages.js';
import { findPortal, portalX } from './portals.js';

// Gives every guard a name for the radio, a home room, and the time of his first check-in.
// The sleeping guard is off the radio: nobody expects to hear from him.
export function setUpRadio(world, cfg = CONFIG.radio) {
  let onRadio = 0;
  for (const guard of world.allGuards) {
    const room = world.layout.rooms[guard.roomId];
    const mates = world.allGuards.filter((other) => other.roomId === guard.roomId);
    guard.homeRoomId = guard.roomId;
    const numbered = mates.length > 1 ? `${room.name} guard ${mates.indexOf(guard) + 1}` : `${room.name} guard`;
    guard.label = guard.name ?? numbered;
    guard.radioAt = guard.sleeper ? null : cfg.firstSeconds + onRadio * cfg.staggerSeconds;
    guard.radioUntil = 0;
    if (!guard.sleeper) onRadio += 1;
  }
}

export const guardPost = (guard) => (guard.patrolMin + guard.patrolMax) / 2;

// A guard who can be sent: awake, on the radio, at home, and not busy.
function free(guard) {
  return isAwake(guard) && !guard.sleeper && !guard.duty
    && guard.state !== 'alert' && guard.roomId === guard.homeRoomId;
}

// The door, hall, or stairs between two rooms, as { exitX, entryX }. Guards do not use vents.
function wayBetween(layout, fromId, toId) {
  const from = layout.rooms[fromId];
  // Guards use doors, halls, and stairs at floor level. Not vents, windows, hatches, or doors
  // that only open from the other side.
  const walkable = (entry) => ['door', 'hall', 'stairs'].includes(entry.type) && !entry.exitOnly && !entry.oneWay
    && !(entry.y > 0);
  const portal = (from.portals ?? []).find((entry) => entry.to === toId && walkable(entry));
  if (!portal) return null;
  const there = findPortal(layout, portal.toPortal);
  return { exitX: portalX(from, portal), entryX: portalX(there.room, there.portal) };
}

// Who goes to look for a guard who did not answer. Returns the guard sent, or null.
export function sendResponder(world, missing) {
  const postX = guardPost(missing);
  const candidates = world.allGuards.filter((guard) => guard !== missing && free(guard));
  const nearest = (list, cost) => (
    list.reduce((best, guard) => (!best || cost(guard) < cost(best) ? guard : best), null)
  );

  // First choice: the nearest guard in the same room.
  // Tower guards stay on their towers, so a guard on the ground goes if there is one.
  const inRoom = candidates.filter((guard) => guard.roomId === missing.homeRoomId);
  const onGround = inRoom.filter((guard) => (guard.y ?? 0) === 0);
  const sameRoom = onGround.length > 0 ? onGround : inRoom;
  if (sameRoom.length > 0) {
    const guard = nearest(sameRoom, (entry) => Math.abs(entry.x - postX));
    makeSuspicious(world, guard, postX);
    return guard;
  }
  // Otherwise the guard with the shortest walk from a room next door. This is the one time a
  // guard leaves his own room.
  const routes = new Map();
  for (const guard of candidates) {
    const way = wayBetween(world.layout, guard.roomId, missing.homeRoomId);
    if (way) routes.set(guard, way);
  }
  for (const guard of [...routes.keys()]) if ((guard.y ?? 0) !== 0) routes.delete(guard);
  const walk = (guard) => Math.abs(guard.x - routes.get(guard).exitX) + Math.abs(routes.get(guard).entryX - postX);
  const guard = nearest([...routes.keys()], walk);
  if (!guard) return null;
  guard.duty = { type: 'radio', stage: 'out', ...routes.get(guard), toRoom: missing.homeRoomId, postX };
  return guard;
}

function missedCheckIn(world, guard) {
  world.events.push({ type: 'missedCheckIn', guardId: guard.id });
  const sent = sendResponder(world, guard);
  const order = sent ? `${sent.label}, go and check.` : 'Nobody is free to check.';
  say(world, `Radio: "No answer from the ${guard.label}... ${order}"`, CONFIG.hintSeconds);
}

// Called every step.
export function updateRadio(world, cfg = CONFIG.radio) {
  for (const guard of world.allGuards) {
    if (guard.radioAt == null || world.time < guard.radioAt) continue;
    guard.radioAt += cfg.intervalSeconds;
    if (guard.state === 'held') {
      // He cannot call out while you hold him. Control tries him again in a few seconds.
      guard.radioAt += cfg.retrySeconds - cfg.intervalSeconds;
    } else if (guard.state === 'out' && guard.codeKnown) {
      // You have his radio code, so you answer for him until he wakes up.
      world.stats.checkInsFaked += 1;
      world.events.push({ type: 'checkInFaked', guardId: guard.id });
      say(world, `Check-in faked. You answer for the ${guard.label}.`);
    } else if (guard.state === 'out') {
      missedCheckIn(world, guard);
    } else {
      guard.radioUntil = world.time + cfg.showSeconds;
      world.events.push({ type: 'checkIn', guardId: guard.id, roomId: guard.roomId });
    }
  }
}

// True while the little radio icon should show over a guard.
export const onRadioNow = (guard, world) => world.time < (guard.radioUntil ?? 0);

function moveToRoom(world, guard, roomId, x) {
  guard.roomId = roomId;
  guard.x = x;
  // His bounds belong to his own room.
  guard.bounds = roomId === guard.homeRoomId ? guard.homeBounds : null;
  guard.obstacles = obstaclesFor(world.layout.rooms[roomId], guard.y ?? 0);
  guard.vault = null;
  guard.seesPlayer = false;
  guard.detection = 0;
  world.guards = world.allGuards.filter((entry) => entry.roomId === world.room.id);
  world.events.push({ type: 'guardMoved', guardId: guard.id, roomId });
}

// A calm guard with the radio duty: walk next door, look at the post, and walk home again.
export function doRadioVisit(guard, world, dt, cfg = CONFIG.guard) {
  const { duty } = guard;
  if (duty.stage === 'out') {
    if (!moveToward(guard, duty.exitX, cfg.suspiciousSpeed, dt)) return;
    moveToRoom(world, guard, duty.toRoom, duty.entryX);
    duty.stage = 'back';
    makeSuspicious(world, guard, duty.postX);
    return;
  }
  // He has looked around and calmed down. Back the way he came.
  if (!moveToward(guard, duty.entryX, cfg.walkSpeed, dt)) return;
  moveToRoom(world, guard, guard.homeRoomId, duty.exitX);
  guard.duty = null;
}
