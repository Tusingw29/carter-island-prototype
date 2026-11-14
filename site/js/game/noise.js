// How much noise the player is making right now.
import { CONFIG } from './config.js';

export function noiseRadius(mode, cfg = CONFIG.noise) {
  if (mode === 'walk') return cfg.walkRadius;
  if (mode === 'run') return cfg.runRadius;
  if (mode === 'crouch') return cfg.crouchRadius;
  return 0;
}
