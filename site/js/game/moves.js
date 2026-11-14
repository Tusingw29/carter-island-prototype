// Jump, slide, and dash. Only used in rooms marked `moves: true` (the gym), where the player
// also has a height above the floor. Everywhere else player.js moves the player.
//
// A room for this can have:
//   solids: boxes to stand on or slide under, as { x, halfWidth, bottom, top }
//   pits:   stretches with no floor, as { from, to }
import { CONFIG } from './config.js';
import { say } from './messages.js';
import { clampToRoom } from './player.js';

const EPS = 1e-6;

const overlapsX = (solid, x, half) => Math.abs(x - solid.x) < solid.halfWidth + half - EPS;
const overlapsY = (solid, y, height) => y < solid.top - EPS && y + height > solid.bottom + EPS;
const inPit = (room, x) => (room.pits ?? []).some((pit) => x > pit.from && x < pit.to);

// Is there room for a body this tall with its feet at (x, y)?
export function fits(room, x, y, height, half = CONFIG.moves.bodyHalfWidth) {
  return !(room.solids ?? []).some((solid) => overlapsX(solid, x, half) && overlapsY(solid, y, height));
}

// The height of whatever is under a body at x whose feet are at y: the floor, a box, or nothing.
export function groundBelow(room, x, y, half = CONFIG.moves.bodyHalfWidth) {
  let ground = inPit(room, x) ? -Infinity : 0;
  for (const solid of room.solids ?? []) {
    if (overlapsX(solid, x, half) && solid.top <= y + EPS) ground = Math.max(ground, solid.top);
  }
  return ground;
}

function land(world, cfg) {
  const { player } = world;
  player.onGround = true;
  player.vy = 0;
  player.airDashUsed = false;
  player.boosted = false;
  world.events.push({ type: 'land' });
  // Landing makes a small noise.
  world.pendingNoises.push({ x: player.x, radius: cfg.noise.landRadius });
}

function startMoves(world, intent, pressed, cfg) {
  const { player, room } = world;
  const m = cfg.moves;
  const canDash = player.dashTime <= 0 && player.dashCooldown <= 0 && !player.sliding
    && (player.onGround || !player.airDashUsed);
  if (pressed.dash && canDash) {
    player.dashTime = m.dashSeconds;
    player.dashDir = intent.moveX || player.facing;
    player.facing = player.dashDir;
    player.airDash = !player.onGround;
    if (player.airDash) player.airDashUsed = true;
    player.vy = 0;
    world.events.push({ type: 'dash' });
  }
  if (!pressed.jump || !player.onGround) return;
  if (intent.crouch && intent.moveX !== 0) {
    // Crouch plus jump while moving is a slide.
    if (player.sliding || player.dashTime > 0) return;
    player.sliding = true;
    player.slideTime = m.slideSeconds;
    player.slideDir = intent.moveX;
    world.events.push({ type: 'slide' });
    return;
  }
  if (player.sliding || !fits(room, player.x, player.y, cfg.player.standHeight, m.bodyHalfWidth)) return;
  // Jumping out of a ground dash keeps the dash speed for the whole jump.
  player.boosted = player.dashTime > 0;
  player.dashTime = 0;
  player.vy = m.jumpSpeed;
  player.onGround = false;
  world.events.push({ type: 'jump' });
}

function sidewaysSpeed(player, intent, cfg) {
  const m = cfg.moves;
  if (player.dashTime > 0) return player.dashDir * m.dashSpeed;
  if (player.sliding) return player.slideDir * m.slideSpeed;
  if (player.dragging) return intent.moveX * cfg.player.dragSpeed;
  if (!player.onGround) {
    if (player.boosted && intent.moveX !== player.dashDir) player.boosted = false;
    if (player.boosted) return player.dashDir * m.dashSpeed;
    return intent.moveX * (intent.run ? cfg.player.runSpeed : cfg.player.walkSpeed);
  }
  if (player.crouching) return intent.moveX * cfg.player.crouchSpeed;
  return intent.moveX * (intent.run ? cfg.player.runSpeed : cfg.player.walkSpeed);
}

function moveSideways(world, vx, height, dt, cfg) {
  const { player, room } = world;
  const half = cfg.moves.bodyHalfWidth;
  let x = clampToRoom(player.x + vx * dt, room.width, cfg.player);
  for (const solid of room.solids ?? []) {
    if (!overlapsY(solid, player.y, height) || !overlapsX(solid, x, half)) continue;
    // Stopped by the side of a box.
    x = vx > 0 ? solid.x - solid.halfWidth - half : solid.x + solid.halfWidth + half;
    player.dashTime = 0;
    player.boosted = false;
  }
  player.x = x;
}

function moveUpAndDown(world, height, airDashing, dt, cfg) {
  const { player, room } = world;
  const m = cfg.moves;
  const half = m.bodyHalfWidth;
  // Walked off an edge.
  if (player.onGround && groundBelow(room, player.x, player.y, half) < player.y - EPS) player.onGround = false;
  if (player.onGround) return;
  // An air dash holds its height. Otherwise gravity: a fast rise and a faster fall, with no float.
  if (!airDashing) {
    player.vy -= (player.vy > 0 ? m.gravity : m.fallGravity) * dt;
    player.vy = Math.max(-m.maxFallSpeed, player.vy);
  }
  let y = player.y + player.vy * dt;
  if (player.vy > 0) {
    for (const solid of room.solids ?? []) {
      const under = player.y + height <= solid.bottom + EPS && y + height > solid.bottom;
      if (overlapsX(solid, player.x, half) && under) {
        y = solid.bottom - height;
        player.vy = 0;
      }
    }
    player.y = y;
    return;
  }
  const ground = groundBelow(room, player.x, player.y, half);
  player.y = Math.max(y, ground);
  if (y <= ground) land(world, cfg);
}

// One step of movement in a room with jumping. pressed is { jump, dash }: true on a fresh press.
export function updateMover(world, intent, pressed, dt, cfg = CONFIG) {
  const { player, room } = world;
  const m = cfg.moves;
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  if (!player.dragging) startMoves(world, intent, pressed, cfg);
  if (intent.moveX !== 0 && player.dashTime <= 0 && !player.sliding) player.facing = intent.moveX;
  // Letting go of jump early cuts the jump short.
  if (!intent.jump && player.vy > m.jumpCutSpeed) player.vy = m.jumpCutSpeed;

  if (player.sliding) {
    player.slideTime -= dt;
    // A slide that ends under something low keeps going until there is room to get up.
    const roomToRise = fits(room, player.x, player.y, cfg.player.crouchHeight, m.bodyHalfWidth);
    if (!player.onGround || (player.slideTime <= 0 && roomToRise)) player.sliding = false;
  }
  const lowCeiling = !fits(room, player.x, player.y, cfg.player.standHeight, m.bodyHalfWidth);
  player.crouching = !player.sliding && player.onGround && !player.dragging && (intent.crouch || lowCeiling);
  const height = moverHeight(player, cfg);

  const vx = sidewaysSpeed(player, intent, cfg);
  const airDashing = player.dashTime > 0 && player.airDash;
  const dashing = player.dashTime > 0;
  if (dashing) {
    player.dashTime -= dt;
    if (player.dashTime <= 0) player.dashCooldown = m.dashCooldownSeconds;
  }
  moveSideways(world, vx, height, dt, cfg);
  moveUpAndDown(world, height, airDashing, dt, cfg);

  if (player.onGround && !inPit(room, player.x)) player.safeX = player.x;
  if (player.y < -m.pitDepth) {
    // Fell down the gap. This is a practice room, so you are put back on the edge.
    Object.assign(player, { x: player.safeX ?? room.playerStart, y: 0, vy: 0, onGround: true, dashTime: 0 });
    player.sliding = false;
    world.events.push({ type: 'fell' });
    say(world, 'You fell. Back on the ledge.');
  }

  player.speed = Math.abs(vx);
  if (dashing) player.mode = 'dash';
  else if (player.sliding) player.mode = 'slide';
  else if (!player.onGround) player.mode = 'jump';
  else if (vx === 0) player.mode = 'idle';
  else if (player.dragging) player.mode = 'drag';
  else if (player.crouching) player.mode = 'crouch';
  else player.mode = intent.run ? 'run' : 'walk';
}

export function moverHeight(player, cfg = CONFIG) {
  if (player.sliding) return cfg.moves.slideHeight;
  return player.crouching ? cfg.player.crouchHeight : cfg.player.standHeight;
}
