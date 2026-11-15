// Solitary: a softer failure. The first time you are caught the run does not end. You lose
// time, the keycard, and whatever you were carrying, wake up in the solitary cell, and are
// walked back to your bed. The second time, the run ends.
import { CONFIG } from './config.js';
import { calmDown } from './alert.js';
import { spotById } from './hiding.js';
import { say } from './messages.js';
import { enterRoom, findPortal } from './portals.js';
import { endRun } from './run.js';

const CELL = 'solitary';

// Where the walk back starts and ends: the solitary door in the bed's room, and the bed.
function wayBack(world) {
  const cell = world.layout.rooms[CELL];
  const door = cell && findPortal(world.layout, cell.portals[0].toPortal);
  const bed = door && spotById(door.room.hideSpots ?? [], 'bed');
  if (!door || !bed) return null;
  return { room: door.room, doorX: door.portal.x, bed, ids: [cell.portals[0].id, door.portal.id] };
}

// Called when a grab ends in capture. Returns 'solitary' or 'caught'.
export function capture(world, cfg = CONFIG) {
  const back = wayBack(world);
  if (world.solitary.used || !back) {
    endRun(world, 'caught');
    return 'caught';
  }
  const { player } = world;
  const penalty = Math.min(cfg.solitary.penaltySeconds, world.timeLeft);
  world.solitary = { used: true, phase: 'cell', timer: cfg.solitary.cellSeconds, at: world.time, penalty };
  world.timeLeft -= penalty;
  world.grab = null;
  world.hold = null;
  world.thrown = [];
  world.aiming = false;
  // The keycard goes back on the desk. What you were carrying is taken. Tools you have earned
  // (the screwdriver, the work boots) are yours to keep.
  Object.assign(player, {
    hasKeycard: false, carrying: null, dragging: null, holding: null, hiddenIn: null, inDark: null, climbing: null,
    escorted: true,
  });
  world.keycardGrab = null;
  // One more chance to mash free, and every guard on edge for the rest of the run.
  world.breakFreeUsed = false;
  world.grabImmunity = 0;
  for (const guard of world.allGuards) {
    if (guard.state === 'held') guard.state = 'calm';
    if (guard.state !== 'out' && guard.state !== 'asleep') calmDown(world, guard);
    Object.assign(guard, { stun: 0, react: 0, lunge: 0, hearing: 0, glance: 0 });
    if (!guard.sleeper) guard.wary = true;
  }
  enterRoom(world, CELL, world.layout.rooms[CELL].playerStart ?? 3);
  for (const id of back.ids) world.knownPortals.add(id);
  world.events.push({ type: 'solitary', penalty });
  say(world, `SOLITARY. ${penalty} seconds lost, and they took the keycard back. (E skips the walk.)`, 8);
  return 'solitary';
}

function putInBed(world, back) {
  const { player } = world;
  if (world.room.id !== back.room.id) enterRoom(world, back.room.id, back.bed.x);
  Object.assign(player, { x: back.bed.x, hiddenIn: 'bed', escorted: false, mode: 'hidden', speed: 0 });
  world.solitary.phase = null;
  world.events.push({ type: 'backInBed' });
  say(world, 'Back in your bed. Every guard is on edge now. Get caught again and it is over.', 8);
}

// While the trip to solitary plays out, the buttons do nothing but skip it. Returns the
// movement to make this step (the walk back to bed), or null when no trip is under way.
export function solitaryStep(world, skip, dt) {
  const { solitary, player } = world;
  if (!solitary.phase) return null;
  const back = wayBack(world);
  if (skip) {
    putInBed(world, back);
    return { moveX: 0 };
  }
  if (solitary.phase === 'cell') {
    solitary.timer -= dt;
    if (solitary.timer > 0) return { moveX: 0 };
    // A guard opens the door and walks you home.
    solitary.phase = 'walk';
    enterRoom(world, back.room.id, back.doorX);
    world.events.push({ type: 'door' });
    say(world, 'A guard walks you back to your cell. (E skips.)', 6);
    return { moveX: 0 };
  }
  const gap = back.bed.x - player.x;
  if (Math.abs(gap) > 0.1) return { moveX: Math.sign(gap) };
  putInBed(world, back);
  return { moveX: 0 };
}

// True while the player is in solitary or being walked back: nothing can see or grab them.
export const inSolitaryTrip = (world) => Boolean(world.solitary.phase);

// 0 to 1: how black the screen is. A quick fade to black as you are taken, then back up.
export function solitaryFade(world, cfg = CONFIG.solitary) {
  const { solitary } = world;
  if (solitary.phase !== 'cell') return 0;
  const since = world.time - solitary.at;
  if (since < cfg.fadeSeconds * 0.6) return 1;
  return Math.max(0, 1 - (since - cfg.fadeSeconds * 0.6) / (cfg.fadeSeconds * 0.4));
}
