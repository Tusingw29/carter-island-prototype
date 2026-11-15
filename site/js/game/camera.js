// Security cameras. Each one watches a stretch of floor that sweeps back and forth.
// Being seen sends nearby guards to Suspicious, and is remembered when you take the keycard.
import { CONFIG } from './config.js';
import { makeSuspicious } from './alert.js';
import { isAwake } from './guard.js';
import { concealedIn } from './hiding.js';
import { playerHeight } from './player.js';
import { litFan, sightBlocked, sightBlockers } from './sight.js';

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

// Where the camera hangs: over the middle of its sweep, up by the ceiling.
export function cameraMount(camera, cfg = CONFIG.camera) {
  return { x: camera.mountX ?? (camera.min + camera.max) / 2, y: camera.mountY ?? cfg.mountHeight };
}

// You are seen if you are on the watched stretch of floor and the camera has a clear line to
// your head or your chest. Solid cover between you and the camera hides you.
export function cameraSeesPlayer(camera, player, blockers = []) {
  if (camera.off || concealedIn(player)) return false;
  if (Math.abs(player.x - camera.x) > camera.halfWidth) return false;
  if (blockers.length === 0) return true;
  const mount = cameraMount(camera);
  const height = playerHeight(player);
  const feetY = player.y ?? 0;
  return [0.9, 0.55].some((share) => !sightBlocked(mount, { x: player.x, y: feetY + height * share }, blockers));
}

// The camera's beam as drawn: from the mount down to the watched stretch, cut off by cover.
export function cameraLit(camera, blockers = []) {
  const mount = cameraMount(camera);
  const angles = [-1, 1].map((side) => Math.atan2(-mount.y, camera.x + side * camera.halfWidth - mount.x));
  return litFan(mount, Math.min(...angles), Math.max(...angles), 80, blockers);
}

function trigger(camera, world, cfg) {
  camera.cooldown = cfg.cooldownSeconds;
  world.seenByCamera = true;
  world.cameraSawIn ??= world.room.name;
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
  camera.sees = camera.roomId === world.room.id
    && cameraSeesPlayer(camera, world.player, sightBlockers(world.room));
  if (!camera.sees) {
    camera.exposure = Math.max(0, camera.exposure - dt);
    return;
  }
  camera.exposure += dt;
  if (camera.exposure >= cfg.noticeSeconds && camera.cooldown <= 0) trigger(camera, world, cfg);
}
