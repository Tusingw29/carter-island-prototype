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

// The first few ghosts of a run carry the words "last seen", until the player knows what they are.
const LABELLED = 3;

// One marker per hunting guard in the room who cannot see the player right now, as
// { guardId, x, y, label }. A guard who can see you needs no marker: he knows exactly where
// you are. label is true while the ghost should carry its "last seen" label.
export function lastSeenMarkers(world) {
  return world.guards
    .filter((guard) => isAwake(guard) && guard.hunting && guard.state !== 'calm' && !guard.seesPlayer)
    .filter((guard) => belief(guard) != null)
    .map((guard) => ({
      guardId: guard.id, x: belief(guard), y: guard.y ?? 0, label: (world.lastSeenCount ?? 0) <= LABELLED,
    }));
}

// Called every step: counts each ghost as it first appears.
export function noteLastSeen(world) {
  const ids = lastSeenMarkers(world).map((marker) => marker.guardId);
  world.lastSeenCount += ids.filter((id) => !world.lastSeenIds.includes(id)).length;
  world.lastSeenIds = ids;
}
