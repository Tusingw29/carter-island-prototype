// Getting into and out of hiding spots (lockers for now).
import { CONFIG } from './config.js';

export function nearestHideSpot(player, spots, cfg = CONFIG.hide) {
  let best = null;
  for (const spot of spots) {
    const distance = Math.abs(spot.x - player.x);
    if (distance <= cfg.reach && (!best || distance < Math.abs(best.x - player.x))) best = spot;
  }
  return best;
}

// Call once per Up press. Returns 'hid', 'left', or null if nothing happened.
export function toggleHide(player, spots, cfg = CONFIG.hide) {
  if (player.hiddenIn) {
    player.hiddenIn = null;
    return 'left';
  }
  const spot = nearestHideSpot(player, spots, cfg);
  if (!spot) return null;
  player.hiddenIn = spot.id;
  player.x = spot.x;
  return 'hid';
}
