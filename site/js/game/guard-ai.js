// What a guard does at each alert level.
import { CONFIG } from './config.js';
import { beginSearch, calmDown, raiseAlarm } from './alert.js';
import { doBedCheck } from './bedcheck.js';
import { tryGrab } from './grab.js';
import { disturb, lookAround, moveToward, patrol } from './guard.js';
import { concealedIn, spotById } from './hiding.js';
import { canHear } from './noise.js';
import { doRadioVisit } from './radio.js';
import { senseBodies } from './senses.js';

const spotsFor = (guard, world) => world.layout.rooms[guard.roomId].hideSpots ?? [];

// Suspicious: walk to the spot, look around, give up.
function investigate(guard, world, dt, cfg) {
  if (!moveToward(guard, guard.targetX, cfg.suspiciousSpeed, dt)) return;
  if (lookAround(guard, dt, cfg.lookAroundSeconds)) calmDown(world, guard);
}

// Alert: run at the player, or at the hiding spot he watched the player get into.
function chase(guard, world, dt, cfg) {
  if (guard.stun > 0) {
    guard.stun -= dt;
    return;
  }
  const knownSpot = guard.knownSpotId && spotById(spotsFor(guard, world), guard.knownSpotId);
  if (guard.trackTimer > 0) {
    guard.trackTimer -= dt;
    if (!knownSpot) guard.lastKnownX = world.player.x;
  }
  // If the player is still in the spot he saw them enter, he walks right up to them.
  const inKnownSpot = knownSpot && concealedIn(world.player) === knownSpot.id;
  const target = inKnownSpot ? world.player.x : (knownSpot?.x ?? guard.lastKnownX);
  const arrived = moveToward(guard, target, cfg.alertSpeed, dt);
  if (tryGrab(guard, world)) return;
  if (!arrived) return;
  guard.knownSpotId = null;
  if (guard.trackTimer <= 0 && !guard.seesPlayer) beginSearch(world, guard, cfg);
}

// The nearest hiding spot to the guard that is close to where the player was lost
// and that no other guard is already checking.
function nextSearchSpot(guard, world, cfg) {
  let best = null;
  for (const spot of spotsFor(guard, world)) {
    if (world.searchClaims.has(spot.id)) continue;
    if (Math.abs(spot.x - guard.searchOrigin) > cfg.searchRadius) continue;
    if (!best || Math.abs(spot.x - guard.x) < Math.abs(best.x - guard.x)) best = spot;
  }
  return best;
}

// Searching: check nearby hiding spots one by one, then look around and calm down.
function search(guard, world, dt, cfg) {
  guard.searchTimer -= dt;
  if (guard.searchTimer <= 0) {
    calmDown(world, guard);
    return;
  }
  if (!guard.checkingSpotId) {
    const next = nextSearchSpot(guard, world, cfg);
    if (next) {
      guard.checkingSpotId = next.id;
      guard.checkTimer = cfg.checkSpotSeconds;
      world.searchClaims.add(next.id);
    }
  }
  if (guard.checkingSpotId) {
    const spot = spotById(spotsFor(guard, world), guard.checkingSpotId);
    if (!moveToward(guard, spot.x, cfg.searchSpeed, dt)) return;
    guard.checkTimer -= dt;
    if (guard.checkTimer > 0) return;
    guard.checkingSpotId = null;
    if (concealedIn(world.player) === spot.id) {
      // Found you. He knows exactly where you are, so the grab follows at once.
      raiseAlarm(world, world.player.x, 'sight', cfg);
      guard.knownSpotId = spot.id;
    }
    return;
  }
  if (lookAround(guard, dt, cfg.lookAroundSeconds)) calmDown(world, guard);
}

// A guard in the same room as the player.
export function updateGuardAI(guard, world, dt, cfg = CONFIG.guard) {
  if (guard.state === 'calm' && guard.duty?.type === 'radio') doRadioVisit(guard, world, dt, cfg);
  else if (guard.state === 'calm' && guard.duty) doBedCheck(guard, world, dt, cfg);
  else if (guard.state === 'calm') patrol(guard, dt, cfg);
  else if (guard.state === 'suspicious') investigate(guard, world, dt, cfg);
  else if (guard.state === 'alert') chase(guard, world, dt, cfg);
  else if (guard.state === 'searching') search(guard, world, dt, cfg);
}

// A guard in some other room. He cannot see or hear the player, so he winds down and patrols.
export function updateGuardAway(guard, world, dt, cfg = CONFIG.guard) {
  guard.seesPlayer = false;
  guard.detection = guard.state === 'alert' ? guard.detection : 0;
  guard.stirTimer = 0;
  if (guard.state === 'alert') beginSearch(world, guard, cfg);
  else updateGuardAI(guard, world, dt, cfg);
  if (guard.stun <= 0) senseBodies(guard, world, cfg);
}

// A sleeping guard in the player's room. Noise disturbs him, and then the clock is running.
export function updateSleeper(guard, world, dt, cfg = CONFIG.guard) {
  if (world.noises.some((noise) => canHear(guard.x, noise))) disturb(guard, cfg);
  if (guard.stirTimer <= 0) return;
  guard.stirTimer -= dt;
  if (guard.stirTimer <= 0) raiseAlarm(world, world.player.x, 'sight', cfg);
}
