// Jump, slide, dash, and climbing. This moves the player in every room except the duct, and
// while hidden (player.js does those). Jump and slide are there from the start of a run. Dash
// needs the work boots, except in the gym.
//
// A room can have:
//   solids:  boxes to stand on or slide under, as { x, halfWidth, bottom, top }.
//            through: true makes one a ledge you can jump up through and stand on. Crouch and
//            jump while standing still on one drops you back down through it.
//            climb: true makes one a fence: hold Up against either side to climb it.
//   pits:    stretches with no floor, as { from, to }
//   ladders: { x, bottom, top }. Hold Up or Down to climb.
import { CONFIG } from './config.js';
import { say } from './messages.js';
import { clampToRoom } from './player.js';

const EPS = 1e-6;

const overlapsX = (solid, x, half) => Math.abs(x - solid.x) < solid.halfWidth + half - EPS;
const overlapsY = (solid, y, height) => y < solid.top - EPS && y + height > solid.bottom + EPS;
const inPit = (room, x) => (room.pits ?? []).some((pit) => x > pit.from && x < pit.to);

// Is there room for a body this tall with its feet at (x, y)?
export function fits(room, x, y, height, half = CONFIG.moves.bodyHalfWidth) {
  return !(room.solids ?? []).some((solid) => (
    !solid.through && overlapsX(solid, x, half) && overlapsY(solid, y, height)
  ));
}

// The height of whatever is under a body at x whose feet are at y: the floor, a box, or nothing.
// skipId is a ledge being dropped through: it does not count.
export function groundBelow(room, x, y, half = CONFIG.moves.bodyHalfWidth, skipId = null) {
  // The floor only counts from above: once you are down a gap, its walls keep you in.
  let ground = inPit(room, x) || y < -EPS ? -Infinity : 0;
  for (const solid of room.solids ?? []) {
    if (solid.id === skipId && skipId !== null) continue;
    if (overlapsX(solid, x, half) && solid.top <= y + EPS) ground = Math.max(ground, solid.top);
  }
  return ground;
}

// Dash is the metroidvania unlock: the work boots. The gym has every move for practice.
export const canDash = (world) => Boolean(world.layout.practice || world.player.hasBoots);

// ---------- Climbing ----------

// Everything in a room that can be climbed, as { x, bottom, top, topX, fence }. A ladder is one.
// A fence is two: one for each side. At the top of a fence you end up standing on it.
export function climbables(room, cfg = CONFIG.moves) {
  const list = (room.ladders ?? []).map((ladder) => ({ ...ladder, topX: ladder.x, fence: false }));
  for (const solid of room.solids ?? []) {
    if (!solid.climb) continue;
    for (const side of [-1, 1]) {
      const x = solid.x + side * (solid.halfWidth + cfg.bodyHalfWidth);
      list.push({ id: `${solid.id}:${side}`, x, bottom: solid.bottom, top: solid.top, topX: solid.x, fence: true });
    }
  }
  return list;
}

// The ladder or fence side the player could grab from where they stand.
export function climbableAt(room, player, cfg = CONFIG.moves) {
  return climbables(room, cfg).find((entry) => (
    Math.abs(entry.x - player.x) <= cfg.climbReach && player.y >= entry.bottom - EPS && player.y <= entry.top + EPS
  )) ?? null;
}

function startClimb(player, entry) {
  player.climbing = entry;
  player.x = entry.x;
  Object.assign(player, { vy: 0, onGround: false, sliding: false, dashTime: 0, boosted: false, jumping: false });
}

// Standing at the top of a ladder or on top of a fence: the way back down, if any.
function climbDownFrom(room, player, cfg) {
  return climbables(room, cfg).find((entry) => {
    if (Math.abs(entry.top - player.y) > EPS || Math.abs(entry.topX - player.x) > cfg.climbReach) return false;
    // Off a fence you go down the side you are facing.
    return !entry.fence || Math.sign(entry.x - entry.topX) === player.facing;
  }) ?? null;
}

function stopClimb(player, onGround) {
  player.climbing = null;
  player.onGround = onGround;
  player.sinceGround = onGround ? 0 : 1;
}

// One step on a ladder or a fence. Up and Down move you. Jump lets go. At the top you step off.
function climbStep(world, intent, pressed, dt, cfg) {
  const { player } = world;
  const entry = player.climbing;
  const speed = entry.fence ? cfg.moves.fenceClimbSpeed : cfg.moves.ladderClimbSpeed;
  const dir = (intent.up ? 1 : 0) - (intent.crouch ? 1 : 0);
  player.x = entry.x;
  player.y += dir * speed * dt;
  player.vy = 0;
  player.crouching = false;
  player.speed = Math.abs(dir) * speed;
  player.mode = 'climb';
  if (intent.moveX !== 0) player.facing = intent.moveX;
  if (player.y >= entry.top - EPS) {
    // Over the top: onto the platform, or onto the top of the fence.
    player.y = entry.top;
    player.x = entry.topX;
    stopClimb(player, true);
  } else if (player.y <= entry.bottom + EPS && dir < 0) {
    player.y = entry.bottom;
    stopClimb(player, true);
  } else if (pressed.jump) {
    // Let go. With a direction held it is a small hop away from the ladder.
    stopClimb(player, false);
    player.vy = intent.moveX !== 0 ? cfg.moves.jumpSpeed * 0.6 : 0;
    player.jumping = true;
  } else if (intent.moveX !== 0 && player.y - entry.bottom < 0.3) {
    // Near the bottom, walking away steps off.
    player.y = entry.bottom;
    stopClimb(player, true);
  } else if (intent.moveX !== 0 && entry.top - player.y < 0.3) {
    // Near the top, walking away steps up onto it.
    player.y = entry.top;
    player.x = entry.topX;
    stopClimb(player, true);
  }
}

// ---------- Jump, slide, dash ----------

// A jump at running speed is as loud as running, at take-off and at landing. Otherwise hopping
// along with Run held would be a silent sprint.
function hopNoise(player, fast, cfg) {
  if (fast) return { x: player.x, y: player.y, radius: cfg.noise.runRadius };
  return { x: player.x, y: player.y, radius: cfg.noise.jumpRadius, amount: cfg.noise.smallAmount };
}

function land(world, cfg) {
  const { player } = world;
  const fast = player.speed > cfg.player.walkSpeed + 0.01;
  player.onGround = true;
  player.vy = 0;
  player.airDashUsed = false;
  player.boosted = false;
  player.jumping = false;
  player.landedAt = world.time;
  player.dropping = null;
  world.events.push({ type: 'land' });
  // Landing makes a small noise.
  const quiet = { x: player.x, y: player.y, radius: cfg.noise.landRadius, amount: cfg.noise.smallAmount };
  world.pendingNoises.push(fast ? hopNoise(player, true, cfg) : quiet);
}

function startDash(world, intent, cfg) {
  const { player } = world;
  player.dashTime = cfg.moves.dashSeconds;
  player.dashDir = intent.moveX || player.facing;
  player.facing = player.dashDir;
  player.airDash = !player.onGround;
  if (player.airDash) player.airDashUsed = true;
  player.vy = 0;
  player.dashedAt = world.time;
  player.dashFromX = player.x;
  // The kick-off is one loud noise: anyone in earshot comes to look.
  world.pendingNoises.push({ x: player.x, y: player.y, radius: cfg.noise.dashRadius });
  world.events.push({ type: 'dash' });
}

function startJump(world, intent, cfg) {
  const { player } = world;
  // A dash jump: jump out of a ground dash, or with dash held down, and the dash speed lasts
  // for the whole jump.
  const dashHeld = intent.dash && canDash(world);
  const dashJump = player.onGround && intent.moveX !== 0 && (player.dashTime > 0 || dashHeld);
  if (dashJump && player.dashTime <= 0) {
    // Started straight from the button, with no dash first. It is just as loud as one.
    player.dashDir = intent.moveX;
    player.dashedAt = world.time;
    player.dashFromX = player.x;
    world.pendingNoises.push({ x: player.x, y: player.y, radius: cfg.noise.dashRadius });
    world.events.push({ type: 'dash' });
  }
  player.boosted = dashJump;
  player.dashTime = 0;
  player.vy = cfg.moves.jumpSpeed;
  player.onGround = false;
  player.jumping = true;
  player.jumpBuffer = 0;
  player.jumpedAt = world.time;
  // Pushing off makes a small noise, like landing.
  const fast = intent.run && intent.moveX !== 0 && !player.crouching;
  world.pendingNoises.push(hopNoise(player, fast || dashJump, cfg));
  world.events.push({ type: 'jump' });
}

function startMoves(world, intent, pressed, dt, cfg) {
  const { player, room } = world;
  const m = cfg.moves;
  const dashReady = canDash(world) && player.dashTime <= 0 && player.dashCooldown <= 0 && !player.sliding
    && (player.onGround || !player.airDashUsed);
  if (pressed.dash && dashReady) startDash(world, intent, cfg);

  // Jump buffering: a press just before landing still counts when you land.
  player.jumpBuffer = pressed.jump ? m.jumpBufferSeconds : Math.max(0, player.jumpBuffer - dt);
  if (player.jumpBuffer <= 0) return;
  if (player.onGround && intent.crouch && intent.moveX !== 0) {
    // Crouch plus jump while moving is a slide.
    if (player.sliding || player.dashTime > 0) return;
    player.sliding = true;
    player.slideTime = m.slideSeconds;
    player.slideDir = intent.moveX;
    player.jumpBuffer = 0;
    world.events.push({ type: 'slide' });
    return;
  }
  // Crouch plus jump standing still on a ledge drops you down through it.
  if (player.onGround && intent.crouch && intent.moveX === 0) {
    const ledge = (room.solids ?? []).find((solid) => (
      solid.through && overlapsX(solid, player.x, m.bodyHalfWidth) && Math.abs(solid.top - player.y) < EPS
    ));
    const hardGround = groundBelow(room, player.x, player.y, m.bodyHalfWidth, ledge?.id ?? null);
    if (ledge && hardGround < player.y - EPS) {
      player.dropping = ledge.id;
      player.onGround = false;
      player.jumping = true;
      player.jumpBuffer = 0;
      return;
    }
  }
  // Coyote time: for a moment after walking off an edge you can still jump.
  const coyote = !player.onGround && !player.jumping && player.sinceGround <= m.coyoteSeconds;
  if (!player.onGround && !coyote) return;
  if (player.sliding || !fits(room, player.x, player.y, cfg.player.standHeight, m.bodyHalfWidth)) return;
  startJump(world, intent, cfg);
}

function sidewaysSpeed(player, intent, cfg) {
  const m = cfg.moves;
  if (player.dashTime > 0) return player.dashDir * m.dashSpeed;
  if (player.sliding) return player.slideDir * m.slideSpeed;
  if (player.holding) return intent.moveX * cfg.takedown.dragSpeed;
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
  // Below floor level, down a gap, the sides of the gap are walls.
  const gap = player.y < -EPS && (room.pits ?? []).find((pit) => player.x >= pit.from && player.x <= pit.to);
  if (gap) x = Math.max(gap.from + EPS, Math.min(gap.to - EPS, x));
  for (const solid of room.solids ?? []) {
    if (solid.through || !overlapsY(solid, player.y, height) || !overlapsX(solid, x, half)) continue;
    // Stopped by the side of a box.
    x = vx > 0 ? solid.x - solid.halfWidth - half : solid.x + solid.halfWidth + half;
    player.dashTime = 0;
    player.boosted = false;
  }
  player.x = x;
}

function moveUpAndDown(world, height, airDashing, fastDrop, dt, cfg) {
  const { player, room } = world;
  const m = cfg.moves;
  const half = m.bodyHalfWidth;
  // Walked off an edge.
  if (player.onGround && groundBelow(room, player.x, player.y, half, player.dropping) < player.y - EPS) {
    player.onGround = false;
  }
  if (player.onGround) return;
  // An air dash holds its height. Otherwise gravity: a fast rise and a faster fall, with no float.
  // Holding down in the air drops faster still.
  if (!airDashing) {
    const pull = player.vy > 0 ? m.gravity : (fastDrop ? m.fastDropGravity : m.fallGravity);
    player.vy -= pull * dt;
    player.vy = Math.max(-(fastDrop ? m.fastDropMaxSpeed : m.maxFallSpeed), player.vy);
  }
  let y = player.y + player.vy * dt;
  if (player.vy > 0) {
    for (const solid of room.solids ?? []) {
      const under = player.y + height <= solid.bottom + EPS && y + height > solid.bottom;
      if (!solid.through && overlapsX(solid, player.x, half) && under) {
        y = solid.bottom - height;
        player.vy = 0;
      }
    }
    player.y = y;
    return;
  }
  const ground = groundBelow(room, player.x, player.y, half, player.dropping);
  player.y = Math.max(y, ground);
  if (y <= ground) land(world, cfg);
}

// One step of movement. pressed is { jump, dash }: true on a fresh press.
// mayClimb is false when Up is busy with something else (a door or a hiding spot in reach).
export function updateMover(world, intent, pressed, dt, cfg = CONFIG, mayClimb = true) {
  const { player, room } = world;
  const m = cfg.moves;
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  const handsFree = !player.dragging && !player.holding;
  if (!player.climbing && mayClimb && handsFree && !player.sliding && player.dashTime <= 0) {
    // Up at a ladder or against a fence starts a climb. Down at the top of one climbs down.
    const up = intent.up ? climbableAt(room, player, m) : null;
    const down = !up && intent.crouch && intent.moveX === 0 && player.onGround ? climbDownFrom(room, player, m) : null;
    if (up && player.y < up.top - EPS) startClimb(player, up);
    else if (down) {
      startClimb(player, down);
      player.y -= 0.02;
    }
  }
  if (player.climbing) {
    climbStep(world, intent, pressed, dt, cfg);
    return;
  }
  player.sinceGround = player.onGround ? 0 : player.sinceGround + dt;
  if (!player.dragging && !player.holding) startMoves(world, intent, pressed, dt, cfg);
  // Holding a guard you keep facing him: you walk him forwards or drag him backwards.
  if (intent.moveX !== 0 && player.dashTime <= 0 && !player.sliding && !player.holding) player.facing = intent.moveX;
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
  moveUpAndDown(world, height, airDashing, Boolean(intent.crouch), dt, cfg);

  if (player.onGround && player.y === 0 && !inPit(room, player.x)) player.safeX = player.x;
  if (player.y < -m.pitDepth) {
    // Fell down the gap. This is a practice room, so you are put back on the edge.
    Object.assign(player, { x: player.safeX ?? room.playerStart, y: 0, vy: 0, onGround: true, dashTime: 0 });
    Object.assign(player, { sliding: false, jumping: false, boosted: false, airDashUsed: false });
    world.events.push({ type: 'fell' });
    say(world, 'You fell. Back on the ledge.');
  }

  player.speed = Math.abs(vx);
  if (dashing) player.mode = 'dash';
  else if (player.sliding) player.mode = 'slide';
  else if (!player.onGround) player.mode = 'jump';
  else if (vx === 0) player.mode = 'idle';
  else if (player.dragging || player.holding) player.mode = 'drag';
  else if (player.crouching) player.mode = 'crouch';
  else player.mode = intent.run ? 'run' : 'walk';
}

export function moverHeight(player, cfg = CONFIG) {
  if (player.sliding) return cfg.moves.slideHeight;
  return player.crouching ? cfg.player.crouchHeight : cfg.player.standHeight;
}

// ---------- The obstacle course ----------

// The course clock starts when the player first moves and stops at the finish line.
export function updateCourse(world) {
  const { player, room } = world;
  if (!room.finish) return;
  world.course ??= { startedAt: null, finishedAt: null, seconds: null };
  const { course } = world;
  if (course.startedAt === null && Math.abs(player.x - room.playerStart) > 0.05) course.startedAt = world.time;
  if (course.startedAt === null || course.finishedAt !== null) return;
  course.seconds = world.time - course.startedAt;
  if (player.x < room.finish.x) return;
  course.finishedAt = world.time;
  world.events.push({ type: 'finish', seconds: course.seconds });
  say(world, `Finished in ${course.seconds.toFixed(2)} s. Press E (or A) to run it again.`, 60);
}
