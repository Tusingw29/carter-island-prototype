// How much noise the player is making right now.
import { CONFIG } from './config.js';

export function noiseRadius(mode, cfg = CONFIG.noise) {
  if (mode === 'walk') return cfg.walkRadius;
  if (mode === 'run') return cfg.runRadius;
  if (mode === 'crouch') return cfg.crouchRadius;
  if (mode === 'drag') return cfg.dragRadius;
  if (mode === 'choke') return cfg.chokeRadius;
  if (mode === 'slide') return cfg.slideRadius;
  if (mode === 'dash') return cfg.dashRadius;
  return 0;
}

// True if someone standing at listenerX can hear the noise.
export function canHear(listenerX, noise) {
  return noise.radius > 0 && Math.abs(listenerX - noise.x) <= noise.radius;
}
