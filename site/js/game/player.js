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
    mode: 'idle',
    speed: 0,
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
  return player.crouching ? cfg.crouchHeight : cfg.standHeight;
}

export function clampToRoom(x, roomWidth, cfg = CONFIG.player) {
  return Math.max(cfg.wallMargin, Math.min(roomWidth - cfg.wallMargin, x));
}

export function updatePlayer(player, intent, dt, roomWidth, cfg = CONFIG.player) {
  player.mode = playerMode(player, intent);
  player.crouching = !player.hiddenIn && !player.dragging && intent.crouch;
  player.speed = speedForMode(player.mode, cfg);
  if (player.hiddenIn) return;
  if (intent.moveX !== 0) player.facing = intent.moveX;
  player.x = clampToRoom(player.x + intent.moveX * player.speed * dt, roomWidth, cfg);
}
