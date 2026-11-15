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

// How to draw a one-off noise at a given moment: a boundary at its full hearing radius, there
// from the first instant, and a pulse that grows inside it. fade goes from 1 to 0 as it dies away.
export function pingRings(ping, time, lifeSeconds = 0.5) {
  const age = Math.max(0, Math.min(1, (time - ping.at) / lifeSeconds));
  return { x: ping.x, y: ping.y ?? 0, boundary: ping.radius, pulse: ping.radius * age, fade: 1 - age };
}

// True if someone standing at listenerX can hear the noise. Height counts too: a noise on the
// ground is further from a guard up a tower than its distance along the floor says.
export function canHear(listenerX, noise, listenerY = 0) {
  if (noise.radius <= 0) return false;
  return Math.hypot(listenerX - noise.x, listenerY - (noise.y ?? 0)) <= noise.radius;
}
