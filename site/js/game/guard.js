// A guard and how he walks. No randomness, so the patrol is the same every run.
import { CONFIG } from './config.js';

export function createGuard({ id, patrol, startX, facing = 1, turnEvery = 0, sleeper = false }) {
  const [from, to] = patrol;
  return {
    id,
    x: startX ?? from,
    facing,
    // calm, suspicious, alert, searching, asleep, or out (knocked out).
    state: sleeper ? 'asleep' : 'calm',
    sleeper,
    // Counts down once a sleeper is disturbed. At zero he wakes up.
    stirTimer: 0,
    // After the silent alarm a guard stays on edge: he patrols faster and notices sooner.
    wary: false,
    turnEvery,
    turnTimer: 0,
    patrolMin: Math.min(from, to),
    patrolMax: Math.max(from, to),
    patrolDir: facing,
    // A guard whose patrol is a single point stands there, always facing this way.
    postFacing: facing,
    pause: 0,
    // Sight: 0 to 1. Full means he is sure he saw you.
    detection: 0,
    seesPlayer: false,
    // Suspicious: the spot he is walking to check.
    targetX: null,
    lookTimer: 0,
    lookFlipped: false,
    // Alert: where he last knew you were, and a hiding spot he watched you get into.
    lastKnownX: null,
    trackTimer: 0,
    knownSpotId: null,
    stun: 0,
    // Searching: the hiding spot he is checking right now.
    checkingSpotId: null,
    checkTimer: 0,
    searchTimer: 0,
    // Knocked out: the hiding spot his body is stuffed in, and whether it was found.
    hiddenIn: null,
    bodyFound: false,
  };
}

export const isConscious = (guard) => guard.state !== 'out';
export const isAwake = (guard) => guard.state !== 'out' && guard.state !== 'asleep';

// A disturbed sleeper wakes up a few seconds later unless you have left the room.
export function disturb(guard, cfg = CONFIG.guard) {
  if (guard.state === 'asleep' && guard.stirTimer <= 0) guard.stirTimer = cfg.stirSeconds;
}

// Walks toward targetX. Returns true once he is standing on it.
export function moveToward(guard, targetX, speed, dt) {
  const gap = targetX - guard.x;
  if (Math.abs(gap) <= speed * dt) {
    guard.x = targetX;
    return true;
  }
  guard.facing = Math.sign(gap);
  guard.x += guard.facing * speed * dt;
  return false;
}

// Stands still and looks one way, then the other. Returns true when finished.
export function lookAround(guard, dt, seconds) {
  guard.lookTimer += dt;
  if (!guard.lookFlipped && guard.lookTimer >= seconds / 2) {
    guard.lookFlipped = true;
    guard.facing = -guard.facing;
  }
  return guard.lookTimer >= seconds;
}

export function patrol(guard, dt, cfg = CONFIG.guard) {
  const speed = guard.wary ? cfg.suspiciousSpeed : cfg.walkSpeed;
  if (guard.patrolMin === guard.patrolMax) {
    if (!moveToward(guard, guard.patrolMin, speed, dt)) return;
    // A standing guard with turnEvery looks one way, then the other, on a fixed beat.
    if (guard.turnEvery > 0) {
      guard.turnTimer += dt;
      if (guard.turnTimer >= guard.turnEvery) {
        guard.turnTimer -= guard.turnEvery;
        guard.postFacing = -guard.postFacing;
      }
    }
    guard.facing = guard.postFacing;
    return;
  }
  // At each end of the patrol the guard stops, looks ahead for a moment, then turns round.
  if (guard.pause > 0) {
    guard.pause -= dt;
    if (guard.pause <= 0) {
      guard.pause = 0;
      guard.patrolDir = -guard.patrolDir;
      guard.facing = guard.patrolDir;
    }
    return;
  }
  const end = guard.patrolDir > 0 ? guard.patrolMax : guard.patrolMin;
  if (moveToward(guard, end, speed, dt)) {
    guard.facing = guard.patrolDir;
    guard.pause = cfg.turnPauseSeconds;
  }
}
