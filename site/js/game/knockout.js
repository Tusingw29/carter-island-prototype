// Knocking guards out from behind, dragging the body, and stuffing it in a locker or cart.
import { CONFIG } from './config.js';
import { isConscious } from './guard.js';
import { nearestHideSpot } from './hiding.js';

// Ids of hiding spots that already hold a body. A full spot cannot hide the player.
export function fullSpotIds(world) {
  return world.allGuards.filter((guard) => guard.hiddenIn).map((guard) => guard.hiddenIn);
}

// A guard you could knock out right now: close, facing away, and not looking at you.
// A sleeping guard can be knocked out from either side.
export function knockoutTarget(world, cfg = CONFIG.knockout) {
  const { player } = world;
  if (player.hiddenIn || player.dragging) return null;
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

function knockOut(world, guard) {
  guard.state = 'out';
  guard.detection = 0;
  guard.seesPlayer = false;
  guard.stun = 0;
  world.stats.knockouts += 1;
  world.events.push({ type: 'knockout', guardId: guard.id });
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
    knockOut(world, guard);
    return 'knockout';
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
}
