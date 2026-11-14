// Decides what pressing Up would act on: the nearest of the doors, stairs, and hiding spots in reach.
import { CONFIG } from './config.js';
import { distanceToSpot, nearestHideSpot } from './hiding.js';
import { fullSpotIds } from './knockout.js';
import { nearestPortal } from './portals.js';

function nearestProp(world, cfg = CONFIG.door) {
  const { player, room } = world;
  return (room.props ?? []).find((prop) => Math.abs(prop.x - player.x) <= cfg.reach) ?? null;
}

// Returns { kind: 'portal', portal }, { kind: 'spot', spot }, or { kind: 'prop', prop }, or null.
export function upTarget(world) {
  const { player, room } = world;
  if (player.hiddenIn || player.dragging) return null;
  const spot = nearestHideSpot(player, room.hideSpots ?? [], fullSpotIds(world));
  const portal = nearestPortal(world);
  if (portal && (!spot || Math.abs(portal.x - player.x) < distanceToSpot(spot, player.x))) {
    return { kind: 'portal', portal };
  }
  if (spot) return { kind: 'spot', spot };
  const prop = nearestProp(world);
  return prop ? { kind: 'prop', prop } : null;
}
