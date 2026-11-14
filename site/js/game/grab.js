// Getting grabbed. One chance per run to mash free. The second grab ends the run.
import { CONFIG } from './config.js';
import { concealedIn } from './hiding.js';
import { clampToRoom } from './player.js';

function canGrab(guard, world, cfg) {
  const { player } = world;
  if (world.grab || world.over || world.grabImmunity > 0) return false;
  if (Math.abs(player.x - guard.x) > cfg.grabReach) return false;
  const hidingIn = concealedIn(player);
  // A hidden player can only be grabbed by a guard who knows which spot they are in.
  if (hidingIn) return guard.knownSpotId === hidingIn;
  return guard.seesPlayer || guard.trackTimer > 0;
}

// Called by an Alert guard every moment. Returns true if he grabbed the player.
export function tryGrab(guard, world, cfg = CONFIG) {
  if (!canGrab(guard, world, cfg.guard)) return false;
  const { player } = world;
  player.hiddenIn = null;
  player.inDark = null;
  player.dragging = null;
  if (world.breakFreeUsed) {
    world.over = 'caught';
    world.events.push({ type: 'caught' });
    return true;
  }
  world.grab = { guardId: guard.id, presses: 0, timeLeft: cfg.grab.mashSeconds };
  world.events.push({ type: 'grab', guardId: guard.id });
  return true;
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
    world.grab = null;
    world.over = 'caught';
    world.events.push({ type: 'caught' });
  }
}
