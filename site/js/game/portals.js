// Ways between rooms: halls, stairs, and doors. Vents arrive in a later step.
import { CONFIG } from './config.js';
import { beginSearch, makeSuspicious } from './alert.js';
import { isAwake } from './guard.js';
import { canHear } from './noise.js';

export function findPortal(layout, id) {
  for (const room of Object.values(layout.rooms)) {
    const portal = (room.portals ?? []).find((p) => p.id === id);
    if (portal) return { room, portal };
  }
  return null;
}

// Where along the floor a portal sits. Halls are at the ends of the room.
export function portalX(room, portal, cfg = CONFIG.player) {
  if (portal.type !== 'hall') return portal.x;
  return portal.side === 'left' ? cfg.wallMargin : room.width - cfg.wallMargin;
}

// The door or stairs the player could use by pressing Up right now.
export function nearestPortal(world, cfg = CONFIG.door) {
  const { player, room } = world;
  if (player.hiddenIn || player.dragging) return null;
  let best = null;
  for (const portal of room.portals ?? []) {
    if (portal.type === 'hall') continue;
    const distance = Math.abs(portal.x - player.x);
    if (distance <= cfg.reach && (!best || distance < Math.abs(best.x - player.x))) best = portal;
  }
  return best;
}

// The hall the player is walking into, if any.
export function hallBeingEntered(world, intent, cfg = CONFIG.player) {
  const { player, room } = world;
  if (player.hiddenIn || player.dragging || intent.moveX === 0) return null;
  return (room.portals ?? []).find((portal) => {
    if (portal.type !== 'hall') return false;
    const outward = portal.side === 'left' ? -1 : 1;
    return intent.moveX === outward && Math.abs(player.x - portalX(room, portal, cfg)) < 0.01;
  }) ?? null;
}

function roomGuards(world, roomId) {
  return world.allGuards.filter((guard) => guard.roomId === roomId);
}

// Puts the player in a room and makes that room the one being played.
export function enterRoom(world, roomId, x) {
  world.room = world.layout.rooms[roomId];
  world.guards = roomGuards(world, roomId);
  world.player.x = x;
  world.visited.add(roomId);
  world.events.push({ type: 'room', roomId });
}

// Goes through a portal. loud is true for a creaky door opened fast.
export function travel(world, portal, loud = false, cfg = CONFIG) {
  const from = world.room;
  const there = findPortal(world.layout, portal.toPortal);
  const fromX = portalX(from, portal);
  let arriveX = portalX(there.room, there.portal);
  // Step just inside a hall so you do not walk straight back out.
  if (there.portal.type === 'hall') arriveX += there.portal.side === 'left' ? 0.4 : -0.4;

  let fleeing = false;
  const slam = { x: fromX, radius: cfg.door.slamRadius };
  for (const guard of roomGuards(world, from.id).filter(isAwake)) {
    guard.seesPlayer = false;
    if (guard.state === 'alert') {
      // Guards do not follow you out of the room. They search near the way you left.
      fleeing = true;
      guard.lastKnownX = fromX;
      beginSearch(world, guard, cfg.guard);
    } else if (loud && canHear(guard.x, slam)) {
      makeSuspicious(world, guard, fromX);
    }
  }

  world.holds.up = null;
  world.holds.interact = null;
  // Anything still in the air stays behind.
  world.thrown = [];
  world.aiming = false;
  world.knownPortals.add(portal.id);
  world.knownPortals.add(there.portal.id);
  enterRoom(world, there.room.id, arriveX);
  world.events.push({ type: loud ? 'doorLoud' : portal.type });
  if (portal.drop) world.pendingNoises.push({ x: arriveX, radius: cfg.vent.landRadius });

  // The noise of the door, and of a chase, carries into the room you arrive in.
  if (loud) world.pendingNoises.push({ x: arriveX, radius: cfg.door.slamRadius });
  if (fleeing) for (const guard of world.guards.filter(isAwake)) makeSuspicious(world, guard, arriveX);
}
