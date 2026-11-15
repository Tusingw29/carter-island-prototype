// Security cameras. Each one watches a stretch of floor that sweeps back and forth.
// Being seen sends nearby guards to Suspicious, and is remembered when you take the keycard.
import { CONFIG } from './config.js';
import { countSpotted, makeSuspicious } from './alert.js';
import { isAwake } from './guard.js';
import { concealedIn } from './hiding.js';
import { say } from './messages.js';
import { stanceFactor } from './stance.js';
import { playerHeight } from './player.js';
import { bodyPoints } from './vision.js';
import { fanPools, inFan, litFan, sightBlockers } from './sight.js';

export function createCamera(def, roomId) {
  // awareness is its meter, 0 to 1. armed means its next call-in counts as a new spotting:
  // it is, once the meter has drained right down since the last one.
  return {
    ...def, roomId, x: def.min, awareness: 0, armed: true, beepIn: 0, cooldown: 0, sees: false, off: false,
    away: false,
  };
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

// A security camera's shape, the same idea: the beam from the camera down to the stretch it
// is watching, stopped by the floor and by cover. Drawn, and used to decide whether it sees you.
export function cameraShape(camera, blockers = []) {
  if (camera.off || camera.away) return null;
  return { fan: cameraLit(camera, blockers) };
}

// Is this body in the beam? Any point up it, feet to head, inside the drawn shape.
function inBeam(camera, player, blockers) {
  const shape = cameraShape(camera, blockers);
  if (!shape) return false;
  return bodyPoints(player.x, playerHeight(player), 6, player.y ?? 0).some((point) => inFan(shape.fan, point));
}

// Cameras and searchlights both catch you where their drawn beam actually falls on you: on the
// ground, on a crate, or half way up a ladder, and nowhere else. One shape for the picture
// and for the rule.
export function cameraSeesPlayer(camera, player, blockers = []) {
  if (camera.off || camera.away || concealedIn(player)) return false;
  return inBeam(camera, player, blockers);
}

// Stepping into a searchlight: the tower guard calls it in, and every guard in the yard goes
// Suspicious and looks toward you. It counts as spotted. It is not a security camera, so it has
// no part in the silent alarm.
function searchlightTrigger(camera, world, cfg) {
  camera.cooldown = cfg.cooldownSeconds;
  if (camera.armed) countSpotted(world, 'searchlight');
  camera.armed = false;
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
  // One stay in its view is one spotting, however long you stand there.
  if (camera.armed) countSpotted(world, 'camera');
  camera.armed = false;
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

export function updateCamera(camera, world, dt, cfg = CONFIG.camera, awareness = CONFIG.awareness) {
  const sweep = cameraSweep(camera, world.time);
  camera.x = sweep.x;
  camera.away = sweep.away;
  camera.cooldown = Math.max(0, camera.cooldown - dt);
  camera.sees = cameraCanSee(camera, world);
  if (!camera.sees) {
    // Out of view the meter drains slowly. Empty, the camera is ready to count you afresh.
    camera.awareness = Math.max(0, camera.awareness - awareness.drainPerSecond * dt);
    if (camera.awareness <= 0) camera.armed = true;
    camera.beepIn = 0;
    return;
  }
  camera.awareness = Math.min(1, camera.awareness + (dt / cfg.fillSeconds) * stanceFactor(world.player, awareness));
  if (camera.awareness < 1) {
    // The tell: a beep that speeds up as the meter fills.
    camera.beepIn -= dt;
    if (camera.beepIn <= 0) {
      camera.beepIn = cfg.beepSlowSeconds + (cfg.beepFastSeconds - cfg.beepSlowSeconds) * camera.awareness;
      world.events.push({ type: 'camBeep', cameraId: camera.id });
    }
    return;
  }
  if (camera.cooldown <= 0) trigger(camera, world, cfg);
}
