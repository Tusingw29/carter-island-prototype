// A guard and how he walks. No randomness, so the patrol is the same every run.
import { CONFIG } from './config.js';

export function createGuard(def) {
  const {
    id, patrol, startX, facing = 1, turnEvery = 0, sleeper = false, checksBed = false, bounds = null, y = 0,
  } = def;
  const [from, to] = patrol;
  return {
    id,
    // What the radio calls him, if the room's name and a number will not do.
    name: def.name ?? null,
    // What he gives up when interrogated, besides his radio code: { type, text, ... }.
    talk: def.talk ?? null,
    interrogated: false,
    codeKnown: false,
    // Hearing: 0 to 1. Part full he glances round. Full, he comes to look. heardX is where
    // the last noise was. glance counts down while he is looking back over his shoulder.
    hearing: 0,
    heardX: null,
    glance: 0,
    glanceCooldown: 0,
    facingBeforeGlance: 1,
    x: startX ?? from,
    // Height of his feet: 0 on the floor, more for a guard up a tower.
    y,
    facing,
    // calm, suspicious, alert, searching, asleep, or out (knocked out).
    state: sleeper ? 'asleep' : 'calm',
    sleeper,
    checksBed,
    // The stretch of floor he never leaves, as [from, to]: a tower platform, or his side of a
    // fence. homeBounds remembers it while he is away in another room.
    bounds,
    homeBounds: bounds,
    // The solid things on his floor that he cannot walk through (set when the world is made),
    // and a vault over one of them while it lasts: { fromX, toX, timeLeft, seconds, height }.
    obstacles: [],
    vault: null,
    // Alert: the pause before he gives chase, the wind-up of a lunge, and how long since he
    // last saw the player.
    react: 0,
    lunge: 0,
    // Reaching into a hiding spot he saw you get into: counts down, then he pulls you out.
    reach: 0,
    reachSpotId: null,
    // His own latest Alert: { at, kind, by, roomId }. For "how you got caught".
    alertRecord: null,
    // Following the player through a door (heat.js), and whether he has done so this hunt.
    following: null,
    pursued: false,
    lostFor: 0,
    // Knocked out: how long he has been down, and the moment it happened.
    outFor: 0,
    outAt: null,
    wakeWarned: false,
    // A job that interrupts his patrol, such as the bed check: { type, x, wait }.
    duty: null,
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
// Up and able to act: not knocked out, not asleep, and not being held by the player.
export const isAwake = (guard) => guard.state !== 'out' && guard.state !== 'asleep' && guard.state !== 'held';

// ---------- Solid things in his way ----------

const BODY = 0.35;

// The solids a guard at this height cannot walk through: anything standing on his floor that
// reaches above his ankles. Ledges you can jump up through do not count, and nor does anything
// wholly above his head.
export function obstaclesFor(room, y = 0) {
  return (room?.solids ?? []).filter((solid) => (
    !solid.through && solid.top > y + 0.2 && solid.bottom < y + 1.8
  ));
}

// The first solid between fromX and toX, or null.
function firstObstacle(guard, fromX, toX) {
  const dir = Math.sign(toX - fromX);
  let first = null;
  for (const solid of guard.obstacles ?? []) {
    const near = solid.x - dir * (solid.halfWidth + BODY);
    // Only one he is not already past, or inside (a guard never starts inside one).
    if ((near - fromX) * dir < -1e-6 || (toX - near) * dir <= 1e-9) continue;
    const far = solid.x + dir * (solid.halfWidth + BODY);
    if (!first || (near - first.near) * dir < 0) first = { solid, near, far };
  }
  return first;
}

// How far he can get from fromX toward toX without passing through anything solid.
export function reachable(guard, fromX, toX) {
  const block = firstObstacle(guard, fromX, toX);
  return block ? block.near : toX;
}

// A vault in progress: he climbs over low cover, slowly. Returns true while it is going on.
export function updateVault(guard, dt) {
  const { vault } = guard;
  if (!vault) return false;
  vault.timeLeft -= dt;
  const done = Math.max(0, Math.min(1, 1 - vault.timeLeft / vault.seconds));
  guard.x = vault.fromX + (vault.toX - vault.fromX) * done;
  if (vault.timeLeft <= 0) {
    guard.x = vault.toX;
    guard.vault = null;
  }
  return true;
}

// 0 to 1 through a vault, and how high the thing he is climbing over is. For the drawing.
export function vaultPose(guard) {
  if (!guard.vault) return null;
  return { progress: 1 - Math.max(0, guard.vault.timeLeft) / guard.vault.seconds, height: guard.vault.height };
}

// A disturbed sleeper wakes up a few seconds later unless you have left the room.
export function disturb(guard, cfg = CONFIG.guard) {
  if (guard.state === 'asleep' && guard.stirTimer <= 0) guard.stirTimer = cfg.stirSeconds;
}

// Walks toward targetX. Returns true once he is standing on it.
// A target outside his bounds counts as reached at the edge of them.
// Solid things stop him. Low cover he vaults, which takes a moment. Tall cover and walls he
// cannot pass: he stops there, and that counts as having got as near as he can.
export function moveToward(guard, wantedX, speed, dt, cfg = CONFIG.guard) {
  if (guard.vault) return false;
  const targetX = guard.bounds ? Math.max(guard.bounds[0], Math.min(guard.bounds[1], wantedX)) : wantedX;
  const gap = targetX - guard.x;
  const dir = Math.sign(gap);
  const stepTo = Math.abs(gap) <= speed * dt ? targetX : guard.x + dir * speed * dt;
  const block = dir === 0 ? null : firstObstacle(guard, guard.x, stepTo);
  if (block) {
    guard.facing = dir;
    guard.x = block.near;
    const height = block.solid.top - (guard.y ?? 0);
    const landsInBounds = !guard.bounds || (block.far >= guard.bounds[0] && block.far <= guard.bounds[1]);
    // The far side has to be worth reaching: a target on top of the crate is as near as this.
    const beyond = (targetX - block.far) * dir >= -1e-9;
    if (height > cfg.vaultMaxHeight || !landsInBounds || !beyond) return true;
    const seconds = cfg.vaultSeconds;
    guard.vault = { fromX: block.near, toX: block.far, timeLeft: seconds, seconds, height };
    return false;
  }
  if (stepTo === targetX) {
    guard.x = targetX;
    return true;
  }
  guard.facing = dir;
  guard.x = stepTo;
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
