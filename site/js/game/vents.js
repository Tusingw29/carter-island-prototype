// Vents: the metroidvania part. Covers are screwed shut until you find the screwdriver.
import { CONFIG } from './config.js';
import { say } from './messages.js';
import { travel } from './portals.js';

export const VENT_MESSAGES = Object.freeze({
  locked: 'Screwed shut. You need a tool to open this.',
  exitOnly: 'This vent only opens from the other side.',
  tooHigh: 'Too high to climb back into.',
  welded: "Welded shut. You'll need something stronger.",
});

export const PROP_MESSAGES = Object.freeze({
  'outer-wall': "Too high. You'll need something to get over this.",
});

// 'open', 'locked' (needs the screwdriver), or 'exitOnly' (cannot be entered from this side).
export function ventState(world, portal) {
  if (portal.exitOnly) return 'exitOnly';
  if (portal.needs === 'screwdriver' && !world.player.hasScrewdriver) return 'locked';
  return 'open';
}

// Up at a vent. Goes through if it can, otherwise says why not.
export function useVent(world, portal) {
  world.knownPortals.add(portal.id);
  const state = ventState(world, portal);
  if (state === 'open') {
    travel(world, portal);
    return true;
  }
  const message = state === 'locked' ? VENT_MESSAGES.locked
    : (portal.to === 'vent-duct' ? VENT_MESSAGES.tooHigh : VENT_MESSAGES.exitOnly);
  say(world, message);
  world.events.push({ type: 'locked' });
  return false;
}

// Up at a prop that cannot be used yet: the welded vent, and the Yard's outer wall.
export function useProp(world, prop) {
  const message = prop.type === 'welded-vent' ? VENT_MESSAGES.welded : PROP_MESSAGES[prop.type];
  if (!message) return;
  say(world, message);
  world.events.push({ type: 'locked' });
}

// The grate the player is on top of, if any.
export function grateHere(world, cfg = CONFIG.vent) {
  const { player, room } = world;
  return (room.grates ?? []).find((grate) => Math.abs(grate.x - player.x) <= cfg.grateReach) ?? null;
}

// What you see looking down through a grate: the room below, its guards, cameras, and hiding spots.
export function peek(world) {
  const grate = grateHere(world);
  if (!grate) return null;
  const room = world.layout.rooms[grate.looksInto];
  return {
    roomId: room.id,
    name: room.name,
    width: room.width,
    guards: world.allGuards.filter((guard) => guard.roomId === room.id && !guard.hiddenIn)
      .map((guard) => ({ id: guard.id, x: guard.x, facing: guard.facing, state: guard.state })),
    cameras: world.cameras.filter((camera) => camera.roomId === room.id && !camera.off)
      .map((camera) => ({ x: camera.x, halfWidth: camera.halfWidth })),
    spots: (room.hideSpots ?? []).map((spot) => ({ x: spot.x, halfWidth: spot.halfWidth ?? 0.5, type: spot.type })),
  };
}
