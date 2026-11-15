// Decides what pressing Up would act on: the nearest of the doors, stairs, and hiding spots in reach.
import { CONFIG } from './config.js';
import { distanceToSpot, nearestHideSpot } from './hiding.js';
import { fullSpotIds } from './knockout.js';
import { nearestPortal } from './portals.js';
import { snitchInReach } from './snitch.js';

function nearestProp(world, cfg = CONFIG.door) {
  const { player, room } = world;
  const types = ['welded-vent', 'outer-wall'];
  return (room.props ?? []).find((prop) => (
    types.includes(prop.type) && Math.abs(prop.x - player.x) <= (prop.reach ?? cfg.reach) && (player.y ?? 0) < 0.3
  )) ?? null;
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
  const snitch = snitchInReach(world);
  if (snitch && !snitch.cellOpen) return { kind: 'cell', snitch };
  const prop = nearestProp(world);
  return prop ? { kind: 'prop', prop } : null;
}
