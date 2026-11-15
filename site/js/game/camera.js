// Security cameras. Each one watches a stretch of floor that sweeps back and forth.
// Being seen sends nearby guards to Suspicious, and is remembered when you take the keycard.
import { CONFIG } from './config.js';
import { makeSuspicious } from './alert.js';
import { isAwake } from './guard.js';
import { concealedIn } from './hiding.js';
import { say } from './messages.js';
import { playerHeight } from './player.js';
import { bodyPoints } from './vision.js';
import { fanPools, inFan, litFan, sightBlocked, sightBlockers } from './sight.js';

export function createCamera(def, roomId) {
  return { ...def, roomId, x: def.min, exposure: 0, cooldown: 0, sees: false, off: false, away: false };
}

// A searchlight is a camera on a guard tower: a pool of light on the ground that sweeps on a
// fixed path and a fixed beat. It is marked kind: 'searchlight' and has a mountX and mountY (the
// lamp), and a guardId (the tower guard who works it).
// At each end of its sweep a searchlight swings away off the ground for awaySeconds, which is
// the gap you cross in. A glow on the ground shows where it will come back down.

// Where the watched stretch is at a given time, as { x, heading, away, backIn }.
// A steady sweep from min to max and back. heading is +1 moving right, -1 moving left.
// With awaySeconds the light leaves the ground for that long at each end: away is true then,
// x is the end it will come back down at, and backIn is the seconds until it does.
export function cameraSweep(camera, time) {
  const span = camera.max - camera.min;
  if (span <= 0 || camera.speed <= 0) return { x: camera.min, heading: 0, away: false, backIn: 0 };
  const sweep = span / camera.speed;
  const pause = camera.awaySeconds ?? 0;
  const phase = time % ((sweep + pause) * 2);
  if (phase <= sweep) return { x: camera.min + phase * camera.speed, heading: 1, away: false, backIn: 0 };
  if (phase < sweep + pause) return { x: camera.max, heading: -1, away: true, backIn: sweep + pause - phase };
  const back = phase - sweep - pause;
  if (back <= sweep) return { x: camera.max - back * camera.speed, heading: -1, away: false, backIn: 0 };
  return { x: camera.min, heading: 1, away: true, backIn: (sweep + pause) * 2 - phase };
}

// Centre of the watched stretch at a given time.
export const cameraCentre = (camera, time) => cameraSweep(camera, time).x;

// Where the camera hangs: over the middle of its sweep, up by the ceiling.
export function cameraMount(camera, cfg = CONFIG.camera) {
  return { x: camera.mountX ?? (camera.min + camera.max) / 2, y: camera.mountY ?? cfg.mountHeight };
}

// The camera's beam as drawn: from the mount down to the watched stretch, cut off by cover.
export function cameraLit(camera, blockers = []) {
  const mount = cameraMount(camera);
  const angles = [-1, 1].map((side) => Math.atan2(-mount.y, camera.x + side * camera.halfWidth - mount.x));
  return litFan(mount, Math.min(...angles), Math.max(...angles), 80, blockers);
}

// The ONE shape of a searchlight's light, used both to draw it and to decide who it catches:
// the beam from the lamp down to the stretch it is aimed at, stopped by the floor and by
// anything solid. Returns null when the light is off or swung away. See sight.js for the parts.
export function searchlightShape(light, blockers = []) {
  if (light.off || light.away) return null;
  const fan = cameraLit(light, blockers);
  return { fan, pools: fanPools(fan, blockers) };
}

// Is this body in the light? Any point up it, feet to head, inside the drawn shape.
function inSearchlight(light, player, blockers) {
  const shape = searchlightShape(light, blockers);
  if (!shape) return false;
  return bodyPoints(player.x, playerHeight(player), 6, player.y ?? 0).some((point) => inFan(shape.fan, point));
}

// A security camera sees you if you are on the watched stretch of floor and it has a clear
// line to your head or your chest. A searchlight catches you where its light actually falls:
// on the ground, on a crate, or half way up a ladder, and nowhere else.
export function cameraSeesPlayer(camera, player, blockers = []) {
  if (camera.off || camera.away || concealedIn(player)) return false;
  if (camera.kind === 'searchlight') return inSearchlight(camera, player, blockers);
  if (Math.abs(player.x - camera.x) > camera.halfWidth) return false;
  if (blockers.length === 0) return true;
  const mount = cameraMount(camera);
  const height = playerHeight(player);
  const feetY = player.y ?? 0;
  return [0.9, 0.55].some((share) => !sightBlocked(mount, { x: player.x, y: feetY + height * share }, blockers));
}

// Stepping into a searchlight: the tower guard calls it in, and every guard in the yard goes
// Suspicious and looks toward you. It counts as spotted. It is not a security camera, so it has
// no part in the silent alarm.
function searchlightTrigger(camera, world, cfg) {
  camera.cooldown = cfg.cooldownSeconds;
  world.stats.timesSpotted += 1;
  world.events.push({ type: 'searchlight', cameraId: camera.id });
  say(world, 'The searchlight has you! The tower guard calls it in.');
  for (const guard of world.guards.filter(isAwake)) makeSuspicious(world, guard, world.player.x);
}

function trigger(camera, world, cfg) {
  if (camera.kind === 'searchlight') {
    searchlightTrigger(camera, world, cfg);
    return;
  }
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

// Can this camera or searchlight see the player right now? Asked by the camera itself each
// step and by the player's lit-or-hidden look (visibility.js).
export function cameraCanSee(camera, world) {
  return camera.roomId === world.room.id && cameraSeesPlayer(camera, world.player, sightBlockers(world.room));
}

export function updateCamera(camera, world, dt, cfg = CONFIG.camera) {
  const sweep = cameraSweep(camera, world.time);
  camera.x = sweep.x;
  camera.away = sweep.away;
  camera.cooldown = Math.max(0, camera.cooldown - dt);
  camera.sees = cameraCanSee(camera, world);
  if (!camera.sees) {
    camera.exposure = Math.max(0, camera.exposure - dt);
    return;
  }
  camera.exposure += dt;
  if (camera.exposure >= cfg.noticeSeconds && camera.cooldown <= 0) trigger(camera, world, cfg);
}
