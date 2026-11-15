// Snitch inmates. Each watches a short stretch of floor beside his cell, first one side, then
// the other, on a fixed beat. If he sees you he yells, and the nearest guard comes to look.
// Once you have the keycard you can open his cell and knock him out.
import { CONFIG } from './config.js';
import { makeSuspicious } from './alert.js';
import { isAwake } from './guard.js';
import { concealedIn } from './hiding.js';
import { say } from './messages.js';

export function createSnitch(def, roomId) {
  return {
    id: def.id,
    roomId,
    x: def.x,
    facing: def.firstLook ?? 1,
    lookTimer: def.offset ?? 0,
    // awake or out (knocked out).
    state: 'awake',
    cellOpen: false,
    exposure: 0,
    cooldown: 0,
    sees: false,
  };
}

// The stretch of floor he is watching right now, as [from, to].
export function snitchWindow(snitch, cfg = CONFIG.snitch) {
  const near = snitch.x + snitch.facing * cfg.blindSpot;
  const far = snitch.x + snitch.facing * cfg.range;
  return [Math.min(near, far), Math.max(near, far)];
}

export function snitchSeesPlayer(snitch, player, cfg = CONFIG.snitch) {
  if (snitch.state !== 'awake' || concealedIn(player)) return false;
  const [from, to] = snitchWindow(snitch, cfg);
  return player.x >= from && player.x <= to;
}

// Can this snitch see the player right now? Asked by the snitch each step and by the player's
// lit-or-hidden look (visibility.js).
export function snitchCanSee(snitch, world, cfg = CONFIG.snitch) {
  return snitch.roomId === world.room.id && snitchSeesPlayer(snitch, world.player, cfg);
}

function yell(snitch, world, cfg) {
  snitch.cooldown = cfg.cooldownSeconds;
  world.stats.timesSpotted += 1;
  world.events.push({ type: 'yell', snitchId: snitch.id });
  say(world, 'A snitch yells: "Guard! Over here!"');
  let nearest = null;
  for (const guard of world.guards.filter(isAwake)) {
    if (!nearest || Math.abs(guard.x - snitch.x) < Math.abs(nearest.x - snitch.x)) nearest = guard;
  }
  if (nearest) makeSuspicious(world, nearest, world.player.x);
}

export function updateSnitch(snitch, world, dt, cfg = CONFIG.snitch) {
  if (snitch.state !== 'awake') return;
  // He keeps the same beat whether or not you are in the room, so it can be learned.
  snitch.lookTimer += dt;
  if (snitch.lookTimer >= cfg.lookSeconds) {
    snitch.lookTimer -= cfg.lookSeconds;
    snitch.facing = -snitch.facing;
  }
  snitch.cooldown = Math.max(0, snitch.cooldown - dt);
  snitch.sees = snitchCanSee(snitch, world, cfg);
  if (!snitch.sees) {
    snitch.exposure = Math.max(0, snitch.exposure - dt);
    return;
  }
  snitch.exposure += dt;
  if (snitch.exposure >= cfg.noticeSeconds && snitch.cooldown <= 0) yell(snitch, world, cfg);
}

// The awake snitch whose cell the player is standing at.
export function snitchInReach(world, cfg = CONFIG.snitch) {
  const { player } = world;
  if (player.hiddenIn || player.dragging) return null;
  return world.snitches.find((snitch) => (
    snitch.roomId === world.room.id && snitch.state === 'awake' && Math.abs(snitch.x - player.x) <= cfg.reach
  )) ?? null;
}

// Up at a snitch's cell. The keycard opens it.
export function openCell(world, snitch) {
  if (snitch.cellOpen) return false;
  if (!world.player.hasKeycard) {
    say(world, 'His cell is locked. A keycard would open it.');
    world.events.push({ type: 'locked' });
    return false;
  }
  snitch.cellOpen = true;
  world.events.push({ type: 'cellOpen', snitchId: snitch.id });
  return true;
}

// The Knockout button at an open cell. Returns true if a snitch was knocked out.
export function knockOutSnitch(world) {
  const snitch = snitchInReach(world);
  if (!snitch || !snitch.cellOpen) return false;
  snitch.state = 'out';
  snitch.sees = false;
  world.stats.knockouts += 1;
  world.events.push({ type: 'knockout', snitchId: snitch.id });
  return true;
}
