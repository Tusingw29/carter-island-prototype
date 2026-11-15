// What a guard notices each moment: the player in his flashlight, noises, and bodies.
import { CONFIG } from './config.js';
import { makeSuspicious, raiseAlarm } from './alert.js';
import { say } from './messages.js';
import { canHear } from './noise.js';
import { sightBlocked, sightBlockers } from './sight.js';
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

function senseSight(guard, world, dt, cfg) {
  const { player } = world;
  const blockers = sightBlockers(world.layout.rooms[guard.roomId]);
  guard.seesPlayer = guard.stun <= 0 && guardSeesPlayer(guard, player, cfg, CONFIG.player, blockers);
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
  if (guard.detection >= 1) {
    const ahead = (player.x - guard.x) * guard.facing;
    const kind = ahead >= 0 && ahead <= cfg.closeSightDistance ? 'closeSight' : 'beam';
    raiseAlarm(world, player.x, 'sight', cfg, guard.roomId, { kind, guard });
  }
  else if (guard.state === 'suspicious') guard.targetX = player.x;
  else if (guard.state === 'calm' && guard.detection >= cfg.glimpseThreshold) makeSuspicious(world, guard, player.x);
}

function senseNoise(guard, world, cfg) {
  for (const noise of world.noises) {
    if (!canHear(guard.x, noise, guard.y ?? 0)) continue;
    if (guard.state === 'alert') guard.lastKnownX = noise.x;
    else if (guard.state !== 'suspicious' || guard.targetX !== noise.x) makeSuspicious(world, guard, noise.x);
  }
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
  senseNoise(guard, world, cfg);
  if (guard.stun <= 0) senseBodies(guard, world, cfg);
}
