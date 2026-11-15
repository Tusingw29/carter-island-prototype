// How the player's movement slows every awareness meter (see awareness.js).
import { CONFIG } from './config.js';

// How much slower a meter fills for the way the player is moving: crouching halves it, and so
// does standing still. Both together quarter it.
export function stanceFactor(player, cfg = CONFIG.awareness) {
  let factor = 1;
  if (player.crouching || player.sliding) factor *= cfg.crouchFactor;
  if ((player.speed ?? 0) === 0) factor *= cfg.stillFactor;
  return factor;
}
