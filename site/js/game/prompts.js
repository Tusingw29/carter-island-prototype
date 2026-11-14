// Works out the one hint to show over the world right now, such as "UP: hide".
import { nearestHideSpot } from './hiding.js';
import { dragTarget, fullSpotIds, knockoutTarget, stuffTarget } from './knockout.js';

// Returns { text, x, y } in world metres, or null when there is nothing to do here.
export function currentPrompt(world) {
  const { player } = world;
  if (world.grab || world.over) return null;
  if (player.hiddenIn) return { text: 'UP: come out', x: player.x, y: 2.75 };
  if (player.dragging) {
    const spot = stuffTarget(world);
    if (spot) return { text: 'UP: stuff body in', x: spot.x, y: 2.75 };
    return { text: 'SPACE: drop body', x: player.x, y: 2.3 };
  }
  const guard = knockoutTarget(world);
  if (guard) return { text: 'SPACE: knock out', x: guard.x, y: 2.75 };
  const body = dragTarget(world);
  if (body) return { text: 'SPACE: drag body', x: body.x, y: 1.2 };
  const spot = nearestHideSpot(player, world.room.hideSpots, fullSpotIds(world));
  if (spot) return { text: 'UP: hide', x: spot.x, y: spot.type === 'cart' ? 1.9 : 2.75 };
  return null;
}
