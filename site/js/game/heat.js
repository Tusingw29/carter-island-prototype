// Heat: what running away through doors costs. Each time you escape a hunt through a door, a
// hall, or stairs, the heat goes up one level, for the rest of the run. It never comes down.
//   1 PURSUIT      one chasing guard follows you through that door into the next room.
//   2 LOCKDOWN     when an Alert starts, that room's doors and halls lock for a few seconds.
//   3 RADIO AHEAD  the guards in the room you flee into are warned, and are Alert as you arrive.
// Vents, the one-way drop, windows, and hatches are never part of this: they stay the way out.
import { CONFIG } from './config.js';
import { say, sayAfter } from './messages.js';

export const HEAT_LEVELS = Object.freeze([
  null,
  { name: 'PURSUIT', text: 'From now on a guard will follow you through one door.' },
  { name: 'LOCKDOWN', text: 'From now on, when you are spotted the doors lock for a few seconds. Vents do not.' },
  { name: 'RADIO AHEAD', text: 'From now on the next room is warned and waiting for you.' },
]);

// The ways out that count: the ones a guard can use and a lockdown can lock.
export const isDoorway = (portal) => ['door', 'hall', 'stairs'].includes(portal.type);

// "HEAT 2: LOCKDOWN", or '' while the heat is still zero. For the HUD.
export function heatLabel(world) {
  return world.heat > 0 ? `HEAT ${world.heat}: ${HEAT_LEVELS[world.heat].name}` : '';
}

// Seconds until the doors of this room unlock. 0 if they are not locked.
export function lockLeft(world, roomId = world.room.id) {
  const { lock } = world;
  return lock && lock.roomId === roomId ? Math.max(0, lock.until - world.time) : 0;
}

// Called when the player gets away from a hunt through a doorway. Returns the new heat level.
export function raiseHeat(world, cfg = CONFIG.heat) {
  if (world.heat >= cfg.maxLevel) return world.heat;
  world.heat += 1;
  const level = HEAT_LEVELS[world.heat];
  world.events.push({ type: 'heatUp', level: world.heat });
  sayAfter(world, `HEAT ${world.heat}: ${level.name}. ${level.text}`, CONFIG.hintSeconds);
  return world.heat;
}

// Which of the guards chasing you follows you through. The one nearest the door, if he is on
// the ground, has not already followed you once in this hunt, and is not dazed.
export function pickPursuer(world, chasers, doorX) {
  if (world.heat < 1) return null;
  const able = chasers.filter((guard) => (guard.y ?? 0) === 0 && !guard.pursued && !guard.sleeper && guard.stun <= 0);
  return able.reduce((best, guard) => (
    !best || Math.abs(guard.x - doorX) < Math.abs(best.x - doorX) ? guard : best
  ), null);
}

// He heads for the door. He comes through a moment after you, so you are never met on arrival.
export function startPursuit(world, guard, toRoomId, arriveX, backX, cfg = CONFIG.heat) {
  guard.following = { toRoom: toRoomId, x: arriveX, backX, at: world.time + cfg.followSeconds };
  world.events.push({ type: 'doorBang', guardId: guard.id });
  say(world, "He's following you!", 3);
}
