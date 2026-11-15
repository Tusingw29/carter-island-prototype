// Getting grabbed. One chance per run to mash free. The second grab ends the run.
import { CONFIG } from './config.js';
import { reachable as furthestReach } from './guard.js';
import { concealedIn } from './hiding.js';
import { clampToRoom } from './player.js';
import { endRun } from './run.js';
import { dropHeldGuard } from './takedown.js';

// A guard cannot grab someone well above or below him.
const sameLevel = (guard, player, cfg) => Math.abs((player.y ?? 0) - (guard.y ?? 0)) <= cfg.grabReachUp;

// Close enough, on his level, and not just broken free.
function inReach(guard, world, cfg) {
  const { player } = world;
  if (world.grab || world.over || world.grabImmunity > 0) return false;
  return Math.abs(player.x - guard.x) <= cfg.grabReach && sameLevel(guard, player, cfg);
}

function grab(guard, world, cfg) {
  const { player } = world;
  player.hiddenIn = null;
  player.inDark = null;
  player.dragging = null;
  player.climbing = null;
  // Whoever you were holding is loose.
  dropHeldGuard(world, cfg);
  // For the score screen: how long after the "!" this grab came, and what the "!" was for.
  const alarm = world.lastAlarm;
  world.lastGrab = {
    at: world.time, by: guard.label ?? null, sinceAlarm: alarm ? world.time - alarm.at : null,
    alarmKind: alarm?.kind ?? null, alarmBy: alarm?.by ?? null,
  };
  if (world.breakFreeUsed) {
    endRun(world, 'caught');
    return;
  }
  world.grab = { guardId: guard.id, presses: 0, timeLeft: cfg.grab.mashSeconds };
  world.events.push({ type: 'grab', guardId: guard.id });
}

// Pulling the player out of a hiding spot the guard watched them get into. No lunge needed:
// he walks up and reaches in. Returns true if he grabbed the player.
export function tryPullOut(guard, world, cfg = CONFIG) {
  const hidingIn = concealedIn(world.player);
  if (!hidingIn || guard.knownSpotId !== hidingIn || !inReach(guard, world, cfg.guard)) return false;
  grab(guard, world, cfg);
  return true;
}

// Should a chasing guard start winding up a lunge? Only at a player in the open that he can see.
export function canLunge(guard, world, cfg = CONFIG.guard) {
  const { player } = world;
  if (world.grab || world.over || world.grabImmunity > 0 || concealedIn(player)) return false;
  if (!sameLevel(guard, player, cfg)) return false;
  if (Math.abs(player.x - guard.x) > cfg.lungeTriggerRange) return false;
  return guard.seesPlayer || guard.trackTimer > 0;
}

export function startLunge(guard, world, cfg = CONFIG.guard) {
  guard.lunge = cfg.lungeWindupSeconds;
  // He commits to the side you are on now. Get past him and he lunges at nothing.
  guard.facing = Math.sign(world.player.x - guard.x) || guard.facing;
  world.events.push({ type: 'lunge', guardId: guard.id, roomId: guard.roomId });
}

// The end of the wind-up: he throws himself forward. Returns true if he got the player.
export function finishLunge(guard, world, cfg = CONFIG) {
  const { player } = world;
  const room = world.layout.rooms[guard.roomId];
  const ahead = (player.x - guard.x) * guard.facing;
  // He stops short of running through you, and goes the whole way if you are not there.
  const travel = ahead >= 0 ? Math.min(cfg.guard.lungeDistance, Math.max(0, ahead - 0.3)) : cfg.guard.lungeDistance;
  const landing = Math.max(0.3, Math.min(room.width - 0.3, guard.x + guard.facing * travel));
  // He cannot lunge through a crate.
  guard.x = furthestReach(guard, guard.x, landing);
  const hidingIn = concealedIn(player);
  const reachable = hidingIn ? guard.knownSpotId === hidingIn : true;
  if (reachable && inReach(guard, world, cfg.guard)) {
    grab(guard, world, cfg);
    return true;
  }
  guard.stun = cfg.guard.lungeMissSeconds;
  world.events.push({ type: 'lungeMiss', guardId: guard.id, roomId: guard.roomId });
  return false;
}

function breakFree(world, cfg) {
  const { player } = world;
  const guard = world.guards.find((g) => g.id === world.grab.guardId);
  const side = Math.sign(player.x - guard.x) || -guard.facing;
  player.x = clampToRoom(player.x + side * cfg.grab.shoveDistance, world.room.width);
  guard.stun = cfg.guard.stunSeconds;
  world.breakFreeUsed = true;
  world.grabImmunity = cfg.grab.immunitySeconds;
  world.grab = null;
  world.events.push({ type: 'free' });
}

// Runs while the player is held. mashed is true on each fresh press of the button.
export function updateGrab(world, mashed, dt, cfg = CONFIG) {
  const { grab } = world;
  if (mashed) grab.presses += 1;
  grab.timeLeft -= dt;
  if (grab.presses >= cfg.grab.mashNeeded) {
    breakFree(world, cfg);
  } else if (grab.timeLeft <= 0) {
    endRun(world, 'caught');
  }
}
