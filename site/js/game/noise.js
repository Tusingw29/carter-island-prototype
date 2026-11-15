// How much noise the player is making right now.
import { CONFIG } from './config.js';

export function noiseRadius(mode, cfg = CONFIG.noise) {
  if (mode === 'walk') return cfg.walkRadius;
  if (mode === 'run') return cfg.runRadius;
  if (mode === 'crouch') return cfg.crouchRadius;
  if (mode === 'drag') return cfg.dragRadius;
  if (mode === 'slide') return cfg.slideRadius;
  if (mode === 'dash') return cfg.dashRadius;
  return 0;
}

// True if someone standing at listenerX can hear the noise. Height counts too: a noise on the
// ground is further from a guard up a tower than its distance along the floor says.
export function canHear(listenerX, noise, listenerY = 0) {
  if (noise.radius <= 0) return false;
  return Math.hypot(listenerX - noise.x, listenerY - (noise.y ?? 0)) <= noise.radius;
}
