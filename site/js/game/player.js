// Player movement. Speed changes are instant: no acceleration, no sliding.
import { CONFIG } from './config.js';

export function createPlayer(x) {
  return {
    x,
    facing: 1,
    crouching: false,
    // Id of the locker or cart the player is inside, or null.
    hiddenIn: null,
    // Id of the dark spot the player is standing still in, or null.
    inDark: null,
    // Id of the knocked-out guard being dragged, or null.
    dragging: null,
    hasKeycard: false,
    hasScrewdriver: false,
    hasCigarettes: false,
    hasBedsheets: false,
    mode: 'idle',
    speed: 0,
    // Height of the feet above the floor, and the rest of what jump, slide, and dash need.
    // Only rooms with moves (the gym) ever change these.
    y: 0,
    vy: 0,
    onGround: true,
    sliding: false,
    slideTime: 0,
    slideDir: 0,
    dashTime: 0,
    dashDir: 0,
    dashCooldown: 0,
    airDash: false,
    airDashUsed: false,
    boosted: false,
    // Coyote time and jump buffering, and when things last happened (for the drawing).
    jumping: false,
    sinceGround: 0,
    jumpBuffer: 0,
    jumpedAt: null,
    landedAt: null,
    dashedAt: null,
    dashFromX: 0,
  };
}

// One of: hidden, idle, walk, run, crouch, drag.
export function playerMode(player, intent) {
  if (player.hiddenIn) return 'hidden';
  if (intent.moveX === 0) return 'idle';
  if (player.dragging) return 'drag';
  if (intent.crouch) return 'crouch';
  return intent.run ? 'run' : 'walk';
}

export function speedForMode(mode, cfg = CONFIG.player) {
  if (mode === 'walk') return cfg.walkSpeed;
  if (mode === 'run') return cfg.runSpeed;
  if (mode === 'crouch') return cfg.crouchSpeed;
  if (mode === 'drag') return cfg.dragSpeed;
  return 0;
}

export function playerHeight(player, cfg = CONFIG.player) {
  if (player.sliding) return CONFIG.moves.slideHeight;
  return player.crouching ? cfg.crouchHeight : cfg.standHeight;
}

export function clampToRoom(x, roomWidth, cfg = CONFIG.player) {
  return Math.max(cfg.wallMargin, Math.min(roomWidth - cfg.wallMargin, x));
}

// hideSpot is the spot the player is inside, if any. Under a wide one you can crawl along, silently.
export function updatePlayer(player, intent, dt, roomWidth, cfg = CONFIG.player, hideSpot = null) {
  player.mode = playerMode(player, intent);
  player.crouching = !player.hiddenIn && !player.dragging && intent.crouch;
  player.speed = speedForMode(player.mode, cfg);
  if (player.hiddenIn) {
    const halfWidth = hideSpot?.halfWidth ?? 0;
    if (halfWidth === 0 || intent.moveX === 0) return;
    player.facing = intent.moveX;
    player.speed = cfg.crouchSpeed;
    const next = player.x + intent.moveX * cfg.crouchSpeed * dt;
    player.x = Math.max(hideSpot.x - halfWidth, Math.min(hideSpot.x + halfWidth, next));
    return;
  }
  if (intent.moveX !== 0) player.facing = intent.moveX;
  player.x = clampToRoom(player.x + intent.moveX * player.speed * dt, roomWidth, cfg);
}
