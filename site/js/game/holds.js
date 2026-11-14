// Tap or hold. Used for creaky doors (Up) and the keycard (Interact).
// A quick tap gives 'fast'. Holding for the full time gives 'slow'. Letting go in between cancels.
import { CONFIG } from './config.js';

// slot is 'up' or 'interact'. key names the thing being acted on, or null if nothing is in reach.
// pressed is true only on a fresh press; held is true for as long as the button is down.
export function updateHold(world, slot, { key, pressed, held }, dt, cfg = CONFIG.hold) {
  let hold = world.holds[slot];
  if (hold && hold.key !== key) {
    world.holds[slot] = null;
    hold = null;
  }
  if (!hold) {
    if (pressed && key) world.holds[slot] = { key, time: 0 };
    return null;
  }
  if (held) {
    hold.time += dt;
    if (hold.time < cfg.slowSeconds) return null;
    world.holds[slot] = null;
    return 'slow';
  }
  world.holds[slot] = null;
  return hold.time <= cfg.tapSeconds ? 'fast' : null;
}

// 0 to 1 while something is being held, for the on-screen progress bar. Otherwise null.
export function holdProgress(world, cfg = CONFIG.hold) {
  const hold = world.holds.up ?? world.holds.interact;
  if (!hold || hold.time <= cfg.tapSeconds) return null;
  return Math.min(1, hold.time / cfg.slowSeconds);
}
