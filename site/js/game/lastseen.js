// "Last seen" markers: where each hunting guard THINKS the player is.
// A guard is hunting from the moment an alarm sends him after the player until he calms down.
import { isAwake } from './guard.js';

// The spot a hunting guard believes in. Chasing: where he last knew you were. Searching: the
// middle of his search. Gone to check a noise: where the noise was.
function belief(guard) {
  if (guard.state === 'alert') return guard.lastKnownX;
  if (guard.state === 'searching') return guard.searchOrigin ?? guard.lastKnownX;
  return guard.targetX;
}

// One marker per hunting guard in the room who cannot see the player right now, as
// { guardId, x, y }. A guard who can see you needs no marker: he knows exactly where you are.
export function lastSeenMarkers(world) {
  return world.guards
    .filter((guard) => isAwake(guard) && guard.hunting && guard.state !== 'calm' && !guard.seesPlayer)
    .filter((guard) => belief(guard) != null)
    .map((guard) => ({ guardId: guard.id, x: belief(guard), y: guard.y ?? 0 }));
}
