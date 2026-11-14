// Where the picture's camera sits: how far back it is and which stretch of the room it shows.
// Numbers only, no drawing, so rules such as "room mode never shows past the walls" can be tested.
//
// Modes (picked with ?cam= on the link):
//   close  follows the player from close up.
//   wide   the same, from twice as far back.
//   room   shows the whole room if it fits. If not, follows the player and stops at the walls.
//   smart  wide while you move; closes in when you hide, are grabbed, or a guard is near.
//          The default: Adam picked it in playtest 2.
import { CONFIG } from './config.js';

export const CAMERA_MODES = Object.freeze(['close', 'wide', 'room', 'smart']);
export const DEFAULT_CAMERA = 'smart';
export const parseCameraMode = (value) => (CAMERA_MODES.includes(value) ? value : DEFAULT_CAMERA);

const START_ZOOM = { close: 'close', wide: 'wide', room: 'wide', smart: 'auto' };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createFraming(mode = DEFAULT_CAMERA, cfg = CONFIG.view) {
  return {
    mode,
    // 'close' or 'wide'. Smart mode also has 'auto', where the game picks.
    zoom: START_ZOOM[mode],
    x: 0,
    distance: cfg.closeDistance,
    // Smart mode: true while the camera should be close in, and how long it stays after.
    tight: false,
    tightFor: 0,
    roomId: null,
  };
}

// The zoom key. Switches between close and wide. In smart mode the third stop is "auto".
export function toggleZoom(framing) {
  const stops = framing.mode === 'smart' ? ['auto', 'close', 'wide'] : ['close', 'wide'];
  framing.zoom = stops[(stops.indexOf(framing.zoom) + 1) % stops.length];
  return framing.zoom;
}

// What the pause menu shows, such as "wide" or "smart (zoom held close)".
export function framingLabel(framing) {
  if (framing.mode === 'smart') return framing.zoom === 'auto' ? 'smart' : `smart (zoom held ${framing.zoom})`;
  return framing.zoom === START_ZOOM[framing.mode] ? framing.mode : `${framing.mode} (zoomed ${framing.zoom})`;
}

// Half the width of floor on screen, in metres, for a camera this far back.
export function halfView(distance, aspect, cfg = CONFIG.view) {
  return Math.tan((cfg.fovDeg * Math.PI) / 360) * distance * aspect;
}

// The stretch of floor on screen: [left, right] in metres.
export function visibleSpan(framing, aspect, cfg = CONFIG.view) {
  const half = halfView(framing.distance, aspect, cfg);
  return [framing.x - half, framing.x + half];
}

// 0 at the close distance, 1 at the wide distance. Used to keep things readable from far back.
export function farness(framing, cfg = CONFIG.view) {
  return clamp((framing.distance - cfg.closeDistance) / (cfg.wideDistance - cfg.closeDistance), 0, 1);
}

// Smart mode: should the camera be close in right now? Once close, a guard has to get a bit
// further away before it pulls back, so it does not flicker at the edge.
export function wantsTight(world, wasTight = false, cfg = CONFIG.view) {
  const { player } = world;
  if (world.grab || player.hiddenIn) return true;
  const reach = wasTight ? cfg.guardFarMetres : cfg.guardNearMetres;
  return world.guards.some((guard) => (
    guard.state !== 'out' && !guard.hiddenIn && Math.abs(guard.x - player.x) <= reach
  ));
}

// How far back the camera is that shows exactly the whole room, end wall to end wall.
function fitDistance(room, aspect, cfg) {
  return (room.width / 2 + cfg.wallThickness) / halfView(1, aspect, cfg);
}

// The distance the camera is heading for.
function goalDistance(framing, room, aspect, cfg) {
  const level = framing.zoom === 'auto' ? (framing.tight ? 'close' : 'wide') : framing.zoom;
  const distance = level === 'close' ? cfg.closeDistance : cfg.wideDistance;
  if (framing.mode !== 'room') return distance;
  // A room that fits, or very nearly fits, is shown whole.
  const fit = fitDistance(room, aspect, cfg);
  return fit <= distance * cfg.roomFitSlack ? fit : distance;
}

// Where the camera should be along the room, for a camera this far back.
function goalX(framing, world, distance, aspect, cfg) {
  const { width } = world.room;
  const half = halfView(distance, aspect, cfg);
  // Room mode stops at the outside of the end walls. The others show a little past them.
  const past = framing.mode === 'room' ? cfg.wallThickness : cfg.followPastWall;
  const min = half - past;
  const max = width + past - half;
  return min > max ? width / 2 : clamp(world.player.x, min, max);
}

// Call once per frame. dt of Infinity jumps straight to where the camera wants to be.
export function updateFraming(framing, world, aspect, dt, cfg = CONFIG.view) {
  const { room } = world;
  const entered = framing.roomId !== room.id;
  framing.roomId = room.id;

  if (framing.mode === 'smart') {
    const tight = wantsTight(world, framing.tight, cfg);
    framing.tightFor = tight ? cfg.tightHoldSeconds : Math.max(0, framing.tightFor - Math.min(dt, 1));
    framing.tight = tight || framing.tightFor > 0;
  }

  const distance = goalDistance(framing, room, aspect, cfg);
  let snap = dt === Infinity;
  if (entered && !snap) {
    if (framing.mode === 'room') {
      // Entering a room: start a little closer in on the player, then ease out to show the room.
      framing.distance = Math.min(framing.distance, distance) * cfg.roomEntryZoom;
      framing.x = world.player.x;
    } else {
      snap = true;
    }
  }
  const zoomBlend = snap ? 1 : 1 - Math.exp(-cfg.zoomSharpness * dt);
  const followBlend = snap ? 1 : 1 - Math.exp(-cfg.followSharpness * dt);
  framing.distance += (distance - framing.distance) * zoomBlend;
  framing.x += (goalX(framing, world, framing.distance, aspect, cfg) - framing.x) * followBlend;

  if (framing.mode === 'room') {
    // The hard rule, applied after the easing: never further back than the room is wide, and
    // never past the outside of an end wall.
    framing.distance = Math.min(framing.distance, fitDistance(room, aspect, cfg));
    framing.x = goalXLimit(framing, room, aspect, cfg);
  }
  return framing;
}

function goalXLimit(framing, room, aspect, cfg) {
  const half = halfView(framing.distance, aspect, cfg);
  const min = half - cfg.wallThickness;
  const max = room.width + cfg.wallThickness - half;
  return min >= max ? room.width / 2 : clamp(framing.x, min, max);
}
