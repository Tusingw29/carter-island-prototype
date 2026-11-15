// What a guard does at each alert level.
import { CONFIG } from './config.js';
import { beginSearch, calmDown, raiseAlarm } from './alert.js';
import { doBedCheck } from './bedcheck.js';
import { canLunge, finishLunge, startLunge, tryPullOut } from './grab.js';
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

// Alert: a moment of shock, then run at the player, or at the hiding spot he watched the
// player get into. Close enough, he winds up a lunge. Lose sight for long enough and he searches.
function chase(guard, world, dt, cfg) {
  // What he knows keeps ticking through the pause, a wind-up, and a stumble.
  const knownSpot = guard.knownSpotId && spotById(spotsFor(guard, world), guard.knownSpotId);
  if (guard.trackTimer > 0) {
    guard.trackTimer -= dt;
    if (!knownSpot) guard.lastKnownX = world.player.x;
  }
  guard.lostFor = guard.seesPlayer ? 0 : guard.lostFor + dt;
  if (guard.react > 0) {
    guard.react -= dt;
    guard.facing = Math.sign(guard.lastKnownX - guard.x) || guard.facing;
    return;
  }
  if (guard.lunge > 0) {
    guard.lunge -= dt;
    if (guard.lunge <= 0) finishLunge(guard, world);
    return;
  }
  if (guard.stun > 0) {
    guard.stun -= dt;
    return;
  }
  if (!knownSpot && guard.lostFor >= cfg.loseSightSeconds) {
    // He has lost you. He searches around the last place he saw you.
    beginSearch(world, guard, cfg);
    return;
  }
  if (canLunge(guard, world, cfg)) {
    startLunge(guard, world, cfg);
    return;
  }
  // If the player is still in the spot he saw them enter, he walks right up to them.
  const inKnownSpot = knownSpot && concealedIn(world.player) === knownSpot.id;
  const target = inKnownSpot ? world.player.x : (knownSpot?.x ?? guard.lastKnownX);
  const arrived = moveToward(guard, target, cfg.alertSpeed, dt);
  if (tryPullOut(guard, world)) return;
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
      raiseAlarm(world, world.player.x, 'sight', cfg, guard.roomId, { kind: 'foundHiding', guard });
      guard.knownSpotId = spot.id;
    }
    return;
  }
  if (lookAround(guard, dt, cfg.lookAroundSeconds)) calmDown(world, guard);
}

// A guard in the same room as the player.
export function updateGuardAI(guard, world, dt, cfg = CONFIG.guard) {
  // Stunned (a cup to the head): he does nothing until it wears off. A chasing guard's stun is
  // handled in chase(), where what he knows keeps ticking.
  if (guard.state !== 'alert' && guard.stun > 0) {
    guard.stun -= dt;
    return;
  }
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
  if (guard.stirTimer > 0) return;
  raiseAlarm(world, world.player.x, 'sight', cfg, guard.roomId, { kind: 'wokeSleeper', guard });
}
