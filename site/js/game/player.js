// Player movement. Speed changes are instant: no acceleration, no sliding.
import { CONFIG } from './config.js';

export function createPlayer(x) {
  return { x, facing: 1, crouching: false, hiddenIn: null, mode: 'idle', speed: 0 };
}

// One of: hidden, idle, walk, run, crouch.
export function playerMode(player, intent) {
  if (player.hiddenIn) return 'hidden';
  if (intent.moveX === 0) return 'idle';
  if (intent.crouch) return 'crouch';
  return intent.run ? 'run' : 'walk';
}

export function speedForMode(mode, cfg = CONFIG.player) {
  if (mode === 'walk') return cfg.walkSpeed;
  if (mode === 'run') return cfg.runSpeed;
  if (mode === 'crouch') return cfg.crouchSpeed;
  return 0;
}

export function playerHeight(player, cfg = CONFIG.player) {
  return player.crouching ? cfg.crouchHeight : cfg.standHeight;
}

export function updatePlayer(player, intent, dt, roomWidth, cfg = CONFIG.player) {
  player.mode = playerMode(player, intent);
  player.crouching = !player.hiddenIn && intent.crouch;
  player.speed = speedForMode(player.mode, cfg);
  if (player.hiddenIn) return;
  if (intent.moveX !== 0) player.facing = intent.moveX;
  const next = player.x + intent.moveX * player.speed * dt;
  player.x = Math.max(cfg.wallMargin, Math.min(roomWidth - cfg.wallMargin, next));
}
