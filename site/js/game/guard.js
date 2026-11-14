// A guard on a fixed patrol. No randomness, so the patrol is the same every run.
import { CONFIG } from './config.js';

export function createGuard({ id, patrol, startX, facing = 1 }) {
  const [from, to] = patrol;
  return {
    id,
    patrolMin: Math.min(from, to),
    patrolMax: Math.max(from, to),
    x: startX ?? from,
    facing,
    pause: 0,
    seesPlayer: false,
  };
}

export function updateGuard(guard, dt, cfg = CONFIG.guard) {
  // At each end of the patrol the guard stops, looks ahead for a moment, then turns round.
  if (guard.pause > 0) {
    guard.pause -= dt;
    if (guard.pause <= 0) {
      guard.pause = 0;
      guard.facing = -guard.facing;
    }
    return;
  }
  guard.x += guard.facing * cfg.walkSpeed * dt;
  if (guard.x >= guard.patrolMax || guard.x <= guard.patrolMin) {
    guard.x = Math.max(guard.patrolMin, Math.min(guard.patrolMax, guard.x));
    guard.pause = cfg.turnPauseSeconds;
  }
}
