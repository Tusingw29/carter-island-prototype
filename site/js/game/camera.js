// Security cameras. Each one watches a stretch of floor that sweeps back and forth.
// Being seen sends nearby guards to Suspicious, and is remembered when you take the keycard.
import { CONFIG } from './config.js';
import { makeSuspicious } from './alert.js';
import { isAwake } from './guard.js';
import { concealedIn } from './hiding.js';

export function createCamera(def, roomId) {
  return { ...def, roomId, x: def.min, exposure: 0, cooldown: 0, sees: false, off: false };
}

// Centre of the watched stretch at a given time: a steady sweep from min to max and back.
export function cameraCentre(camera, time) {
  const span = camera.max - camera.min;
  if (span <= 0) return camera.min;
  const travelled = (time * camera.speed) % (span * 2);
  return camera.min + (travelled <= span ? travelled : span * 2 - travelled);
}

export function cameraSeesPlayer(camera, player) {
  if (camera.off || concealedIn(player)) return false;
  return Math.abs(player.x - camera.x) <= camera.halfWidth;
}

function trigger(camera, world, cfg) {
  camera.cooldown = cfg.cooldownSeconds;
  world.seenByCamera = true;
  world.stats.timesSpotted += 1;
  world.events.push({ type: 'camera', cameraId: camera.id });
  for (const guard of world.guards.filter(isAwake)) makeSuspicious(world, guard, world.player.x);
  // A camera in a room with no guards calls one over from next door.
  const called = world.allGuards.find((guard) => guard.id === camera.callsGuard);
  if (called && isAwake(called)) makeSuspicious(world, called, camera.callsTo);
}

export function updateCamera(camera, world, dt, cfg = CONFIG.camera) {
  camera.x = cameraCentre(camera, world.time);
  camera.cooldown = Math.max(0, camera.cooldown - dt);
  camera.sees = camera.roomId === world.room.id && cameraSeesPlayer(camera, world.player);
  if (!camera.sees) {
    camera.exposure = Math.max(0, camera.exposure - dt);
    return;
  }
  camera.exposure += dt;
  if (camera.exposure >= cfg.noticeSeconds && camera.cooldown <= 0) trigger(camera, world, cfg);
}
