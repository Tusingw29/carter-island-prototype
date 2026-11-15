// Throwables: small things lying around that you can carry one at a time and throw.
// Hit a guard on the head and he is stunned. Miss and it lands with a clatter, and calm guards
// who hear it walk over to that spot, which is how you lure one away.
import { CONFIG } from './config.js';
import { makeSuspicious } from './alert.js';
import { isConscious } from './guard.js';
import { say } from './messages.js';

// noise is how far the landing is heard (the config value if left out). bounces is how many
// times it bounces before it stops.
export const THROWABLES = Object.freeze({
  cup: { name: 'cup' },
  mug: { name: 'mug' },
  soap: { name: 'bar of soap', noise: 5 },
  can: { name: 'oil can' },
  // Bounces twice and is heard from much further away than a cup: a big lure.
  basketball: { name: 'basketball', noise: 11, bounces: 2 },
});

export const isThrowable = (item) => Boolean(THROWABLES[item.type]);
export const throwableName = (item) => THROWABLES[item.type].name;

export function throwableInReach(world, cfg = CONFIG.throwing) {
  const { player, room } = world;
  if (player.hiddenIn || player.dragging) return null;
  return (room.items ?? []).find((item) => (
    isThrowable(item) && !world.taken.has(item.id) && Math.abs(item.x - player.x) <= cfg.reach
      && Math.abs((item.y ?? 0) - (player.y ?? 0)) <= 0.6
  )) ?? null;
}

export function pickUpThrowable(world, item) {
  const { player } = world;
  if (player.carrying) {
    say(world, `Your hands are full. Throw the ${throwableName(player.carrying)} first.`);
    return false;
  }
  world.taken.add(item.id);
  player.carrying = { id: item.id, type: item.type };
  world.events.push({ type: 'pickup', itemId: item.id });
  say(world, `A ${throwableName(item)}. Hold F (or Left Bumper) to aim, let go to throw.`);
  return true;
}

// Can the player aim and throw right now?
export function canThrow(world) {
  const { player } = world;
  return Boolean(player.carrying) && !player.hiddenIn && !player.dragging && !world.grab;
}

// Where a throw would start and how fast, if it were let go right now.
export function throwStart(world, cfg = CONFIG.throwing) {
  const { player } = world;
  const hand = player.crouching || player.sliding ? cfg.crouchHandHeight : cfg.handHeight;
  return {
    x: player.x + player.facing * 0.3,
    y: (player.y ?? 0) + hand,
    vx: player.facing * cfg.speedX,
    vy: cfg.speedY,
    fromX: player.x,
  };
}

const inBox = (box, x, y) => (
  x > box.x - box.halfWidth && x < box.x + box.halfWidth && y > box.bottom && y < box.top
);
const overPit = (room, x) => (room.pits ?? []).some((pit) => x > pit.from && x < pit.to);

// Moves a flying thing one step. Returns 'flying', 'landed', or 'lost' (down a gap).
// It stops dead against the side of anything solid and drops from there.
export function stepFlight(thing, room, dt, cfg = CONFIG.throwing) {
  thing.vy -= cfg.gravity * dt;
  let x = thing.x + thing.vx * dt;
  let y = thing.y + thing.vy * dt;
  if (x < 0.15 || x > room.width - 0.15) {
    x = Math.max(0.15, Math.min(room.width - 0.15, x));
    thing.vx = 0;
  }
  for (const box of room.solids ?? []) {
    if (!inBox(box, x, y)) continue;
    if (thing.vy <= 0 && thing.y >= box.top - 1e-6) {
      // Came down onto the top of it.
      thing.x = x;
      thing.y = box.top;
      return 'landed';
    }
    if (inBox(box, thing.x, y)) {
      // Hit the underside: stop rising.
      y = thing.y;
      thing.vy = Math.min(0, thing.vy);
    } else {
      x = thing.x;
      thing.vx = 0;
    }
  }
  thing.x = x;
  thing.y = y;
  if (y <= 0 && !overPit(room, x)) {
    thing.y = 0;
    return 'landed';
  }
  return y < -CONFIG.moves.pitDepth ? 'lost' : 'flying';
}

// The dotted line shown while aiming: points along the path, ending where it would first land.
export function throwArc(world, cfg = CONFIG.throwing) {
  const thing = throwStart(world, cfg);
  const points = [{ x: thing.x, y: thing.y }];
  for (let i = 1; i <= 360; i += 1) {
    const state = stepFlight(thing, world.room, 1 / 120, cfg);
    if (i % 6 === 0 || state !== 'flying') points.push({ x: thing.x, y: thing.y });
    if (state !== 'flying') break;
  }
  return points;
}

function launch(world, cfg) {
  const { player } = world;
  const item = player.carrying;
  const kind = THROWABLES[item.type];
  const flight = throwStart(world, cfg);
  world.thrown.push({ ...flight, item, bounces: kind.bounces ?? 0, noise: kind.noise ?? cfg.noiseRadius });
  player.carrying = null;
  world.events.push({ type: 'throw', itemId: item.id });
}

// The guard whose head is at this point, if any.
function headAt(world, x, y, cfg) {
  return world.guards.find((guard) => {
    if (!isConscious(guard) || guard.state === 'asleep' || guard.hiddenIn) return false;
    const feetY = guard.y ?? 0;
    return Math.abs(x - guard.x) <= cfg.headHalfWidth && y >= feetY + cfg.headBottom && y <= feetY + cfg.headTop;
  }) ?? null;
}

function bonk(world, guard, thing, cfg) {
  guard.stun = cfg.stunSeconds;
  guard.seesPlayer = false;
  guard.lunge = 0;
  guard.hitAt = world.time;
  if (guard.state !== 'alert') {
    // He looks toward where it came from, and goes to check once his head clears.
    makeSuspicious(world, guard, thing.fromX);
    guard.facing = Math.sign(thing.fromX - guard.x) || guard.facing;
  }
  world.events.push({ type: 'bonk', guardId: guard.id, itemId: thing.item.id });
}

function land(world, thing, cfg) {
  world.pendingNoises.push({ x: thing.x, radius: thing.noise });
  world.events.push({ type: 'clatter', x: thing.x, itemId: thing.item.id, bounce: thing.bounces > 0 });
  if (thing.bounces <= 0) return true;
  thing.bounces -= 1;
  thing.vy = Math.abs(thing.vy) * cfg.bounceUp;
  thing.vx *= cfg.bounceAlong;
  return false;
}

// Called every step. held is the throw button: hold to aim, let go to throw.
export function updateThrowing(world, held, dt, cfg = CONFIG.throwing) {
  const able = canThrow(world);
  if (able && held) world.aiming = true;
  else {
    if (able && world.aiming) launch(world, cfg);
    world.aiming = false;
  }
  if (world.thrown.length === 0) return;
  world.thrown = world.thrown.filter((thing) => {
    const state = stepFlight(thing, world.room, dt, cfg);
    if (state === 'lost') return false;
    if (state === 'landed') return !land(world, thing, cfg);
    const guard = headAt(world, thing.x, thing.y, cfg);
    if (!guard) return true;
    bonk(world, guard, thing, cfg);
    return false;
  });
}
