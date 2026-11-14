// What a guard notices each moment: the player in his flashlight, noises, and bodies.
import { CONFIG } from './config.js';
import { makeSuspicious, raiseAlarm } from './alert.js';
import { canHear } from './noise.js';
import { coneShape, guardSeesPlayer, pointInCone } from './vision.js';

// How fast the detection meter fills, per second. Close is fast, the edge of the beam is slow.
export function detectionRate(guard, distance, cfg = CONFIG.guard) {
  const span = cfg.coneRange - cfg.detectNearDistance;
  const far = Math.max(0, Math.min(1, (distance - cfg.detectNearDistance) / span));
  const seconds = cfg.detectNearSeconds + (cfg.detectFarSeconds - cfg.detectNearSeconds) * far;
  let boost = 1;
  if (guard.state === 'suspicious') boost = cfg.suspiciousDetectBoost;
  if (guard.state === 'searching') boost = cfg.searchingDetectBoost;
  return boost / seconds;
}

function senseSight(guard, world, dt, cfg) {
  const { player } = world;
  guard.seesPlayer = guard.stun <= 0 && guardSeesPlayer(guard, player);
  if (!guard.seesPlayer) {
    if (guard.state !== 'alert') guard.detection = Math.max(0, guard.detection - cfg.detectDrainPerSecond * dt);
    return;
  }
  if (guard.state === 'alert') {
    guard.lastKnownX = player.x;
    guard.trackTimer = cfg.trackSeconds;
    return;
  }
  const rate = detectionRate(guard, Math.abs(player.x - guard.x), cfg);
  guard.detection = Math.min(1, guard.detection + rate * dt);
  if (guard.detection >= 1) raiseAlarm(world, player.x, 'sight', cfg);
  else if (guard.state === 'suspicious') guard.targetX = player.x;
  else if (guard.state === 'calm' && guard.detection >= cfg.glimpseThreshold) makeSuspicious(world, guard, player.x);
}

function senseNoise(guard, world, cfg) {
  for (const noise of world.noises) {
    if (!canHear(guard.x, noise)) continue;
    if (guard.state === 'alert') guard.lastKnownX = noise.x;
    else if (guard.state !== 'suspicious' || guard.targetX !== noise.x) makeSuspicious(world, guard, noise.x);
  }
}

function senseBodies(guard, world, cfg) {
  const shape = coneShape(guard, cfg);
  for (const body of world.guards) {
    if (body.state !== 'out' || body.hiddenIn || body.bodyFound) continue;
    if (!pointInCone(shape, { x: body.x, y: 0.3 })) continue;
    body.bodyFound = true;
    world.stats.bodiesFound += 1;
    world.events.push({ type: 'bodyFound', guardId: guard.id, bodyId: body.id });
    raiseAlarm(world, body.x, 'body', cfg);
  }
}

export function updateSenses(guard, world, dt, cfg = CONFIG.guard) {
  senseSight(guard, world, dt, cfg);
  senseNoise(guard, world, cfg);
  if (guard.stun <= 0) senseBodies(guard, world, cfg);
}
