// Hiding spots: lockers and laundry carts you climb into, and pitch-dark spots you stand still in.
import { CONFIG } from './config.js';

const CONTAINERS = ['locker', 'cart', 'bed', 'table', 'counter', 'desk', 'shelf', 'bleachers'];

export const isContainer = (spot) => CONTAINERS.includes(spot.type);

export function spotById(spots, id) {
  return spots.find((spot) => spot.id === id) ?? null;
}

// How far x is from the nearest part of a spot. Wide spots (tables, counters) count from their ends.
export function distanceToSpot(spot, x) {
  return Math.max(0, Math.abs(spot.x - x) - (spot.halfWidth ?? 0));
}

// The closest container within reach. fullIds lists spots already holding a body.
export function nearestHideSpot(player, spots, fullIds = [], cfg = CONFIG.hide) {
  let best = null;
  for (const spot of spots) {
    if (!isContainer(spot) || fullIds.includes(spot.id)) continue;
    // You have to be standing on the same level as the spot.
    if (Math.abs((player.y ?? 0) - (spot.y ?? 0)) > 0.3) continue;
    const distance = distanceToSpot(spot, player.x);
    if (distance <= cfg.reach && (!best || distance < distanceToSpot(best, player.x))) best = spot;
  }
  return best;
}

// Call once per Up press. Returns 'hid', 'left', or null if nothing happened.
export function toggleHide(player, spots, fullIds = [], cfg = CONFIG.hide) {
  if (player.hiddenIn) {
    player.hiddenIn = null;
    return 'left';
  }
  if (player.dragging) return null;
  const spot = nearestHideSpot(player, spots, fullIds, cfg);
  if (!spot) return null;
  const halfWidth = spot.halfWidth ?? 0;
  player.hiddenIn = spot.id;
  player.x = Math.max(spot.x - halfWidth, Math.min(spot.x + halfWidth, player.x));
  return 'hid';
}

// The dark spot the player is standing still in, or null. Moving gives you away.
export function darkSpotAt(player, spots) {
  if (player.hiddenIn || player.dragging || player.mode !== 'idle') return null;
  const spot = spots.find((s) => (
    s.type === 'dark' && Math.abs(s.x - player.x) <= s.halfWidth && Math.abs((player.y ?? 0) - (s.y ?? 0)) <= 1
  ));
  return spot ? spot.id : null;
}

// The id of whatever is hiding the player right now, or null if they are in the open.
// Being walked back from solitary counts: nobody is looking for you then.
export function concealedIn(player) {
  if (player.escorted) return 'escort';
  return player.hiddenIn ?? player.inDark ?? null;
}
