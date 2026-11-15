// The shove: for a guard who is facing you or hunting you. It has its own button (R, or Left
// Trigger). Space never shoves. A shove staggers him for a moment: run, or grab him while he
// reels. It is loud, it gives you away, and it needs a few seconds to be ready again.
// Shove a guard toward the edge of a platform he is standing near and he falls off it.
import { CONFIG } from './config.js';
import { raiseAlarm } from './alert.js';
import { isAwake, obstaclesFor, reachable } from './guard.js';

// Can he be shoved? Only a guard who is facing you, can see you, or is already hunting. One
// who has not noticed you is for grabbing, quietly.
export function knowsOfPlayer(guard, player) {
  const facingYou = (player.x - guard.x) * guard.facing > 0;
  return facingYou || guard.seesPlayer || guard.state === 'alert' || guard.state === 'searching';
}

// Every awake guard in reach, on your level. The one you are facing comes first.
function inReach(world, cfg) {
  const { player } = world;
  if (player.hiddenIn || player.dragging || world.hold) return [];
  const feetY = player.y ?? 0;
  return world.guards
    .filter((guard) => isAwake(guard) && !guard.falling && Math.abs(guard.x - player.x) <= cfg.reach
      && Math.abs(feetY - (guard.y ?? 0)) <= cfg.reachUp)
    .sort((a, b) => {
      const cost = (guard) => Math.abs(guard.x - player.x) + ((guard.x - player.x) * player.facing >= 0 ? 0 : 10);
      return cost(a) - cost(b);
    });
}

// The guard the shove button would shove right now, or null.
export function shoveTarget(world, cfg = CONFIG.shove) {
  return inReach(world, cfg).find((guard) => knowsOfPlayer(guard, world.player)) ?? null;
}

// A guard in reach who cannot be shoved because he has not noticed you. The shove button on
// him does nothing but say so.
export function unawareInReach(world, cfg = CONFIG.shove) {
  if (shoveTarget(world, cfg)) return null;
  return inReach(world, cfg)[0] ?? null;
}

export const shoveReady = (world) => world.time >= world.shoveReadyAt;

// 0 just after a shove, 1 when it is ready again. For the cooldown meter.
export function shoveCharge(world, cfg = CONFIG.shove) {
  return Math.max(0, Math.min(1, 1 - (world.shoveReadyAt - world.time) / cfg.cooldownSeconds));
}

// How much of a guard's stagger is left, as { seconds, share } (share runs from 1 down to 0),
// or null if he is not staggering. For the stun bar over his head. This is when HE can act
// again. The cooldown meter is when YOU can shove again. They are different clocks.
export function staggerLeft(guard) {
  if (!(guard.stun > 0) || !guard.staggerFull || guard.state === 'out') return null;
  return { seconds: guard.stun, share: Math.min(1, guard.stun / guard.staggerFull) };
}

// True while a shoved guard is still reeling: the moment he can be grabbed from any side.
export const isStaggering = (guard) => Boolean(staggerLeft(guard)) && !guard.falling;

// ---------- Ledges ----------

// If this guard were shoved toward `side` (+1 right, -1 left), would he go off the edge of
// what he is standing on? Returns { edgeX, landX, landY, height } or null. Only a guard up on
// a platform, within a push of its edge, falls. The floor has no edges.
export function ledgeFall(world, guard, side, cfg = CONFIG.shove) {
  const feetY = guard.y ?? 0;
  if (feetY <= 0) return null;
  const room = world.layout.rooms[guard.roomId];
  const solids = room.solids ?? [];
  const under = solids.find((solid) => (
    Math.abs(solid.top - feetY) < 1e-6 && Math.abs(guard.x - solid.x) <= solid.halfWidth + 1e-6
  ));
  if (!under) return null;
  const edgeX = under.x + side * under.halfWidth;
  if (Math.abs(edgeX - guard.x) > cfg.pushMetres + cfg.edgeSlack) return null;
  // Where he comes down: clear of the edge, on the highest thing below him there.
  const landX = Math.max(0.4, Math.min(room.width - 0.4, edgeX + side * cfg.fallClear));
  let landY = 0;
  for (const solid of solids) {
    if (solid.top < feetY - 1e-6 && Math.abs(landX - solid.x) < solid.halfWidth) landY = Math.max(landY, solid.top);
  }
  return { edgeX, landX, landY, height: feetY - landY };
}

// The ledge a shove on this guard would send him off right now, if any. For the edge tell.
export function ledgeFor(world, guard, cfg = CONFIG.shove) {
  const side = Math.sign(guard.x - world.player.x) || world.player.facing;
  const fall = ledgeFall(world, guard, side, cfg);
  return fall ? { ...fall, side } : null;
}

// One step of a guard going off a ledge: he reels to the edge, then falls to the ground
// below, along a real path. take.knockOut is passed in so this file does not import
// knockout.js (which imports this one). Returns true while the fall is still going on.
export function updateFall(guard, world, dt, knockOut, cfg = CONFIG) {
  const fall = guard.falling;
  if (!fall) return false;
  if ((fall.landX - guard.x) * fall.side > 1e-6) {
    // Reeling backwards across the platform and over the edge.
    guard.x = guard.x + fall.side * Math.min(cfg.shove.reelSpeed * dt, Math.abs(fall.landX - guard.x));
    return true;
  }
  fall.vy -= cfg.moves.fallGravity * dt;
  guard.y = Math.max(fall.landY, guard.y + fall.vy * dt);
  if (guard.y > fall.landY) return true;
  // He has landed. He is off his platform for good: no bounds, and he stands where he fell.
  const room = world.layout.rooms[guard.roomId];
  guard.falling = null;
  Object.assign(guard, {
    bounds: null, homeBounds: null, patrolMin: guard.x, patrolMax: guard.x, obstacles: obstaclesFor(room, guard.y),
  });
  // A fall is loud whatever it does to him.
  world.pendingNoises.push({ x: guard.x, y: guard.y, radius: cfg.shove.fallNoiseRadius });
  world.events.push({ type: 'fallLand', guardId: guard.id, roomId: guard.roomId, height: fall.height });
  if (fall.height >= cfg.shove.fallKnockoutMetres) {
    knockOut(world, guard, 'ledge');
  } else {
    // A short drop: winded on the ground for a while, then up and after you.
    guard.stun = cfg.shove.shortFallStunSeconds;
    guard.staggerFull = guard.stun;
  }
  return false;
}

// ---------- The shove itself ----------

export function shove(world, guard, cfg = CONFIG) {
  const { player } = world;
  const room = world.layout.rooms[guard.roomId];
  const side = Math.sign(guard.x - player.x) || player.facing;
  player.facing = side;
  const fall = ledgeFall(world, guard, side, cfg.shove);
  // It gives you away: if he was not already chasing you, he is now.
  if (guard.state !== 'alert') {
    raiseAlarm(world, player.x, 'sight', cfg.guard, guard.roomId, { kind: 'shove', guard });
  }
  guard.facing = -side;
  guard.stun = cfg.shove.stunSeconds;
  guard.staggerFull = guard.stun;
  // No pause and no lunge: he is staggering.
  guard.react = 0;
  guard.lunge = 0;
  guard.reach = 0;
  guard.vault = null;
  guard.seesPlayer = false;
  guard.hitAt = world.time;
  if (fall) {
    // Near the edge of his platform: he goes over it.
    guard.falling = { ...fall, side, vy: 0 };
    guard.stun = Math.max(guard.stun, 5);
    world.stats.shovedOff += 1;
    world.events.push({ type: 'shoveOff', guardId: guard.id, height: fall.height });
  } else {
    const [min, max] = guard.bounds ?? [0.3, room.width - 0.3];
    guard.x = reachable(guard, guard.x, Math.max(min, Math.min(max, guard.x + side * cfg.shove.pushMetres)));
  }
  world.stats.shoves += 1;
  world.shoveReadyAt = world.time + cfg.shove.cooldownSeconds;
  world.pendingNoises.push({ x: player.x, radius: cfg.shove.noiseRadius });
  world.events.push({ type: 'shove', guardId: guard.id });
}

// The shove button. Returns what happened: 'shove', 'notReady', 'unaware', or null.
export function pressShove(world, cfg = CONFIG) {
  const target = shoveTarget(world, cfg.shove);
  const flash = (guard, why) => {
    world.risky = { guardId: guard.id, why, until: world.time + cfg.knockout.riskySeconds };
    world.events.push({ type: 'tooRisky', guardId: guard.id });
    return why;
  };
  if (target && shoveReady(world)) {
    shove(world, target, cfg);
    return 'shove';
  }
  if (target) return flash(target, 'notReady');
  const unaware = unawareInReach(world, cfg.shove);
  return unaware ? flash(unaware, 'unaware') : null;
}
