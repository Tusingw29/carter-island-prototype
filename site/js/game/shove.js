// The shove: for a guard who can see you. It stuns him for a moment so you can run.
// It is loud, it counts as being spotted, and it needs a few seconds to be ready again.
import { CONFIG } from './config.js';
import { raiseAlarm } from './alert.js';
import { isAwake, reachable } from './guard.js';

// The guard a press of the button would shove: awake and within reach. The one you are facing
// comes first. Failing that, the nearest, and you turn to face him.
export function shoveTarget(world, cfg = CONFIG.shove) {
  const { player } = world;
  if (player.hiddenIn || player.dragging) return null;
  const feetY = player.y ?? 0;
  let best = null;
  let bestCost = Infinity;
  for (const guard of world.guards) {
    const offset = guard.x - player.x;
    if (!isAwake(guard) || Math.abs(offset) > cfg.reach) continue;
    if (Math.abs(feetY - (guard.y ?? 0)) > cfg.reachUp) continue;
    const facingHim = offset * player.facing >= 0;
    const cost = Math.abs(offset) + (facingHim ? 0 : 10);
    if (cost < bestCost) {
      best = guard;
      bestCost = cost;
    }
  }
  return best;
}

export const shoveReady = (world) => world.time >= world.shoveReadyAt;

// 0 just after a shove, 1 when it is ready again. For the meter.
export function shoveCharge(world, cfg = CONFIG.shove) {
  return Math.max(0, Math.min(1, 1 - (world.shoveReadyAt - world.time) / cfg.cooldownSeconds));
}

export function shove(world, guard, cfg = CONFIG) {
  const { player } = world;
  const room = world.layout.rooms[guard.roomId];
  const side = Math.sign(guard.x - player.x) || player.facing;
  player.facing = side;
  // It gives you away: if he was not already chasing you, he is now.
  if (guard.state !== 'alert') {
    raiseAlarm(world, player.x, 'sight', cfg.guard, guard.roomId, { kind: 'shove', guard });
  }
  const [min, max] = guard.bounds ?? [0.3, room.width - 0.3];
  guard.x = reachable(guard, guard.x, Math.max(min, Math.min(max, guard.x + side * cfg.shove.pushMetres)));
  guard.vault = null;
  guard.facing = -side;
  guard.stun = cfg.shove.stunSeconds;
  // No pause and no lunge: he is staggering.
  guard.react = 0;
  guard.lunge = 0;
  guard.seesPlayer = false;
  guard.hitAt = world.time;
  world.shoveReadyAt = world.time + cfg.shove.cooldownSeconds;
  world.pendingNoises.push({ x: player.x, radius: cfg.shove.noiseRadius });
  world.events.push({ type: 'shove', guardId: guard.id });
}
