// Ways between rooms: halls, stairs, and doors. Vents arrive in a later step.
import { CONFIG } from './config.js';
import { beginSearch, makeSuspicious, raiseAlarm } from './alert.js';
import { isDoorway, lockLeft, pickPursuer, raiseHeat, startPursuit } from './heat.js';
import { say } from './messages.js';
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
    // A portal up on a ledge or a roof can only be used from up there.
    if (Math.abs((portal.y ?? 0) - (player.y ?? 0)) > 0.3) continue;
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

// Puts the player in a room and makes that room the one being played. y is the height of the
// spot they arrive at: 0 unless the way in is up on a ledge.
export function enterRoom(world, roomId, x, y = 0) {
  world.room = world.layout.rooms[roomId];
  world.guards = roomGuards(world, roomId);
  world.player.x = x;
  Object.assign(world.player, {
    y, vy: 0, onGround: true, sliding: false, dashTime: 0, boosted: false, jumping: false, climbing: null,
    dropping: null,
  });
  world.visited.add(roomId);
  world.events.push({ type: 'room', roomId });
}

// Goes through a portal. loud is true for a creaky door opened fast.
export function travel(world, portal, loud = false, cfg = CONFIG) {
  const from = world.room;
  // Lockdown: the doors and halls of a room where an Alert has just started do not open.
  if (isDoorway(portal) && lockLeft(world, from.id) > 0) {
    if (world.time >= (world.lockSaidAt ?? -1) + 1) {
      say(world, `Locked down! ${Math.ceil(lockLeft(world, from.id))} s. Vents still open.`, 1.5);
      world.events.push({ type: 'locked' });
      world.lockSaidAt = world.time;
    }
    return false;
  }
  const there = findPortal(world.layout, portal.toPortal);
  const fromX = portalX(from, portal);
  let arriveX = portalX(there.room, there.portal);
  const doorX = arriveX;
  // Step just inside a hall so you do not walk straight back out.
  if (there.portal.type === 'hall') arriveX += there.portal.side === 'left' ? 0.4 : -0.4;

  const awake = roomGuards(world, from.id).filter(isAwake);
  const chasers = awake.filter((guard) => guard.state === 'alert');
  const fleeing = chasers.length > 0;
  // Getting away from a hunt through a doorway raises the heat. From heat 1 on, one of the
  // guards chasing you follows you through. Vents and the drop do neither.
  const escalates = fleeing && isDoorway(portal) && !portal.locked;
  if (escalates) raiseHeat(world, cfg.heat);
  const pursuer = escalates ? pickPursuer(world, chasers, fromX) : null;
  const slam = { x: fromX, radius: cfg.door.slamRadius };
  for (const guard of awake) {
    guard.seesPlayer = false;
    if (guard === pursuer) {
      startPursuit(world, guard, there.room.id, doorX, fromX, cfg.heat);
    } else if (guard.state === 'alert') {
      // The rest do not follow you out of the room. They search near the way you left.
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
  enterRoom(world, there.room.id, arriveX, there.portal.y ?? 0);
  world.events.push({ type: loud ? 'doorLoud' : portal.type });
  if (portal.drop) world.pendingNoises.push({ x: arriveX, radius: cfg.vent.landRadius });

  // The noise of the door, and of a chase, carries into the room you arrive in.
  if (loud) world.pendingNoises.push({ x: arriveX, radius: cfg.door.slamRadius });
  if (!fleeing) return true;
  if (escalates && world.heat >= 3) {
    // Radio ahead: the guards here were warned. They are Alert and facing the way you came in,
    // with the usual moment of shock before they move.
    const warned = world.guards.filter((guard) => isAwake(guard) && !guard.sleeper);
    if (warned.length > 0) {
      raiseAlarm(world, arriveX, 'radio', cfg.guard, there.room.id, { kind: 'radioAhead', guard: null });
      for (const guard of warned) {
        guard.facing = Math.sign(arriveX - guard.x) || guard.facing;
        guard.trackTimer = cfg.guard.trackSeconds;
      }
      world.events.push({ type: 'radioAhead', roomId: there.room.id });
    }
    return true;
  }
  for (const guard of world.guards.filter(isAwake)) makeSuspicious(world, guard, arriveX);
  return true;
}
