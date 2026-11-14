// Decides what pressing Up would act on: the nearest of the doors, stairs, and hiding spots in reach.
import { distanceToSpot, nearestHideSpot } from './hiding.js';
import { fullSpotIds } from './knockout.js';
import { nearestPortal } from './portals.js';

// Returns { kind: 'portal', portal } or { kind: 'spot', spot }, or null.
export function upTarget(world) {
  const { player, room } = world;
  if (player.hiddenIn || player.dragging) return null;
  const spot = nearestHideSpot(player, room.hideSpots ?? [], fullSpotIds(world));
  const portal = nearestPortal(world);
  if (portal && (!spot || Math.abs(portal.x - player.x) < distanceToSpot(spot, player.x))) {
    return { kind: 'portal', portal };
  }
  return spot ? { kind: 'spot', spot } : null;
}
