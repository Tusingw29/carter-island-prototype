// What a guard notices each moment: the player in his flashlight, noises, and bodies.
import { CONFIG } from './config.js';
import { makeSuspicious, raiseAlarm } from './alert.js';
import { litAreaAt } from './lights.js';
import { say } from './messages.js';
import { canHear } from './noise.js';
import { sightBlocked, sightBlockers } from './sight.js';
import { stanceFactor } from './stance.js';
import { coneShape, guardSeesPlayer, pointInCone } from './vision.js';

// How fast the detection meter fills, per second. Close is fast, the edge of the beam is slow.
export function detectionRate(guard, distance, cfg = CONFIG.guard) {
  const span = cfg.coneRange - cfg.detectNearDistance;
  const far = Math.max(0, Math.min(1, (distance - cfg.detectNearDistance) / span));
  const seconds = cfg.detectNearSeconds + (cfg.detectFarSeconds - cfg.detectNearSeconds) * far;
  let boost = 1;
  if (guard.state === 'suspicious' || guard.wary) boost = cfg.suspiciousDetectBoost;
  if (guard.state === 'searching') boost = cfg.searchingDetectBoost;
  return boost / seconds;
}

// Can this guard see the player right now? The one question asked both by his senses and by
// the player's lit-or-hidden look (visibility.js).
export function guardCanSee(guard, world, cfg = CONFIG.guard) {
  const blockers = sightBlockers(world.layout.rooms[guard.roomId]);
  return guard.stun <= 0 && guardSeesPlayer(guard, world.player, cfg, CONFIG.player, blockers);
}

function senseSight(guard, world, dt, cfg) {
  const { player } = world;
  guard.seesPlayer = guardCanSee(guard, world, cfg);
  if (!guard.seesPlayer) {
    if (guard.state !== 'alert') guard.detection = Math.max(0, guard.detection - cfg.detectDrainPerSecond * dt);
    return;
  }
  if (guard.state === 'alert') {
    guard.lastKnownX = player.x;
    guard.trackTimer = cfg.trackSeconds;
    return;
  }
  // Under a lamp you are plain to see: he is as sure as if you were right in front of him.
  const lit = litAreaAt(world.layout.rooms[guard.roomId], player);
  // Crouching and standing still each halve how fast he becomes sure.
  const rate = detectionRate(guard, lit ? 0 : Math.abs(player.x - guard.x), cfg) * stanceFactor(player);
  guard.detection = Math.min(1, guard.detection + rate * dt);
  if (guard.detection >= 1) {
    const ahead = (player.x - guard.x) * guard.facing;
    const kind = ahead >= 0 && ahead <= cfg.closeSightDistance ? 'closeSight' : 'beam';
    raiseAlarm(world, player.x, 'sight', cfg, guard.roomId, { kind, guard });
  }
  else if (guard.state === 'suspicious') guard.targetX = player.x;
  else if (guard.state === 'calm' && guard.detection >= cfg.glimpseThreshold) makeSuspicious(world, guard, player.x);
}

// Noise fills his hearing meter. A steady noise (footsteps) fills it over about a second,
// faster the closer it is. A one-off noise adds its amount at once: a loud one fills it.
// Part full, a calm guard glances back over his shoulder. Full, he goes to look.
function senseNoise(guard, world, dt, cfg) {
  guard.glanceCooldown = Math.max(0, guard.glanceCooldown - dt);
  let heard = false;
  for (const noise of world.noises) {
    if (!canHear(guard.x, noise, guard.y ?? 0)) continue;
    if (guard.state === 'alert') {
      guard.lastKnownX = noise.x;
      continue;
    }
    heard = true;
    const distance = Math.hypot(guard.x - noise.x, (guard.y ?? 0) - (noise.y ?? 0));
    const steady = (dt / cfg.hearSeconds) * (2 - distance / noise.radius);
    guard.hearing = Math.min(1, guard.hearing + (noise.steady ? steady : (noise.amount ?? 1)));
    guard.heardX = noise.x;
  }
  if (!heard) {
    guard.hearing = Math.max(0, guard.hearing - cfg.hearDrainPerSecond * dt);
    return;
  }
  if (guard.hearing >= 1) {
    guard.hearing = 0;
    endGlance(guard);
    makeSuspicious(world, guard, guard.heardX);
  } else if (guard.state === 'calm' && guard.hearing >= cfg.glanceAt && guard.glance <= 0
    && guard.glanceCooldown <= 0 && !guard.duty) {
    guard.glance = cfg.glanceSeconds;
    guard.facingBeforeGlance = guard.facing;
    guard.facing = Math.sign(guard.heardX - guard.x) || guard.facing;
    world.events.push({ type: 'glance', guardId: guard.id, roomId: guard.roomId });
  }
}

// Stops a glance and turns him back the way he was facing.
export function endGlance(guard, cfg = CONFIG.guard) {
  if (guard.glance <= 0) return;
  guard.glance = 0;
  guard.facing = guard.facingBeforeGlance;
  guard.glanceCooldown = cfg.glanceCooldownSeconds;
}

// A guard notices a body lying in the open in his own room, whether or not the player is there.
export function senseBodies(guard, world, cfg = CONFIG.guard) {
  const shape = coneShape(guard, cfg);
  const blockers = sightBlockers(world.layout.rooms[guard.roomId]);
  for (const body of world.allGuards) {
    if (body.roomId !== guard.roomId || body.state !== 'out' || body.hiddenIn || body.bodyFound) continue;
    const lying = { x: body.x, y: (body.y ?? 0) + 0.3 };
    if (!pointInCone(shape, lying) || sightBlocked(shape.origin, lying, blockers)) continue;
    body.bodyFound = true;
    world.stats.bodiesFound += 1;
    world.events.push({ type: 'bodyFound', guardId: guard.id, bodyId: body.id, roomId: guard.roomId });
    if (guard.roomId !== world.room.id) {
      say(world, `Radio: "Man down in the ${world.layout.rooms[guard.roomId].name}!"`);
    }
    raiseAlarm(world, body.x, 'body', cfg, guard.roomId, { kind: 'body', guard });
  }
}

export function updateSenses(guard, world, dt, cfg = CONFIG.guard) {
  senseSight(guard, world, dt, cfg);
  senseNoise(guard, world, dt, cfg);
  if (guard.stun <= 0) senseBodies(guard, world, cfg);
}
