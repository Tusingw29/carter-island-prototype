// Pursuit (heat 1 and up): a guard who is following the player through a door arrives in the
// next room a moment after them, still chasing. When that hunt is over he walks back home.
import { CONFIG } from './config.js';
import { moveToRoom } from './radio.js';

// Called every step: brings each following guard through his door when his moment comes.
export function updatePursuits(world, cfg = CONFIG) {
  for (const guard of world.allGuards) {
    const { following } = guard;
    if (!following) continue;
    if (guard.state !== 'alert') {
      guard.following = null;
      continue;
    }
    if (world.time < following.at) continue;
    guard.following = null;
    moveToRoom(world, guard, following.toRoom, following.x);
    const here = world.room.id === following.toRoom;
    Object.assign(guard, {
      // He bursts in, takes a moment to find you, and then he is after you.
      detection: 1, react: cfg.guard.reactSeconds, lunge: 0, lostFor: 0, pursued: true,
      lastKnownX: here ? world.player.x : following.x, trackTimer: here ? cfg.guard.trackSeconds : 0,
      // The way home, for when the hunt is over (the same walk a radio check ends with).
      duty: { type: 'radio', stage: 'back', entryX: following.x, exitX: following.backX },
    });
    guard.facing = Math.sign(guard.lastKnownX - guard.x) || guard.facing;
    // Heat 2 and up: a guard bursting in after you is an Alert starting in this room, so its
    // doors lock behind him.
    if (here && world.heat >= 2) {
      world.lock = { roomId: following.toRoom, until: world.time + cfg.heat.lockSeconds };
      world.events.push({ type: 'doorsLock', roomId: following.toRoom });
    }
    world.events.push({ type: 'pursuerArrives', guardId: guard.id, roomId: following.toRoom });
  }
}
