// Whole clean runs, built from planned legs. Used by tests and to report run times.
import { CONFIG } from '../../site/js/game/config.js';
import { findPortal, portalX } from '../../site/js/game/portals.js';
import { createWorld } from '../../site/js/game/world.js';
import { follow, holdUntil, plan, release } from './planner.mjs';

const HOLD = CONFIG.hold.slowSeconds + 0.3;

function mustPlan(world, goal, label) {
  const steps = plan(world, goal);
  if (!steps) throw new Error(`no clean way found: ${label} (in ${world.room.name})`);
  follow(world, steps);
}

// Where a portal brings you out. Returns null if that spot is in the dark, which is always safe.
function arrival(world, portal) {
  const there = findPortal(world.layout, portal.toPortal);
  const x = portalX(there.room, there.portal);
  const dark = (there.room.hideSpots ?? []).some((s) => s.type === 'dark' && Math.abs(s.x - x) < s.halfWidth);
  return dark ? null : { roomId: there.room.id, x };
}

// Walks out through a hall at the end of the current room.
export function leaveByHall(world, portalId, log) {
  const started = world.time;
  const portal = world.room.portals.find((p) => p.id === portalId);
  const name = world.room.name;
  mustPlan(world, { x: portalX(world.room, portal), arrive: arrival(world, portal) }, portalId);
  holdUntil(world, { moveX: portal.side === 'left' ? -1 : 1, crouch: true }, (w) => w.room.id === portal.to);
  log.push({ room: name, seconds: world.time - started });
}

// Opens a door quietly (hold Up) or takes the stairs.
export function leaveByDoor(world, portalId, log) {
  const started = world.time;
  const portal = world.room.portals.find((p) => p.id === portalId);
  const name = world.room.name;
  const holdSeconds = portal.creaky ? HOLD : 0;
  mustPlan(world, { x: portal.x, tolerance: 0.4, holdSeconds, arrive: arrival(world, portal) }, portalId);
  holdUntil(world, { up: true, crouch: true }, (w) => w.room.id === portal.to);
  release(world);
  log.push({ room: name, seconds: world.time - started });
}

export function liftKeycard(world, log) {
  const started = world.time;
  const card = world.room.items.find((item) => item.type === 'keycard');
  mustPlan(world, { x: card.x, tolerance: 0.5, holdSeconds: HOLD }, 'keycard');
  holdUntil(world, { interact: true, crouch: true }, (w) => w.player.hasKeycard);
  release(world);
  log.push({ room: `${world.room.name} (keycard)`, seconds: world.time - started });
}

export function goToBedAndSleep(world, log) {
  const started = world.time;
  mustPlan(world, { x: world.room.hideSpots.find((s) => s.id === 'bed').x, tolerance: 0.5, hidden: 'bed' }, 'bed');
  release(world);
  holdUntil(world, { interact: true }, (w) => w.over !== null);
  log.push({ room: `${world.room.name} (to bed)`, seconds: world.time - started });
}

// The front door route: out through the Mess Hall and Stairwell, and back the same way.
export function frontDoorRun() {
  const world = createWorld();
  const log = [];
  leaveByHall(world, 'cb-east', log);
  leaveByHall(world, 'mh-east', log);
  leaveByDoor(world, 'sw-door', log);
  liftKeycard(world, log);
  leaveByDoor(world, 'go-door', log);
  leaveByHall(world, 'sw-west', log);
  leaveByHall(world, 'mh-west', log);
  goToBedAndSleep(world, log);
  return { world, log, seconds: world.time };
}
