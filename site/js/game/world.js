// The whole game state and the one function that moves it forward in time.
import { CELL_BLOCK } from './rooms.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuard, updateGuard } from './guard.js';
import { toggleHide } from './hiding.js';
import { guardSeesPlayer } from './vision.js';
import { noiseRadius } from './noise.js';

export function createWorld(room = CELL_BLOCK) {
  return {
    room,
    time: 0,
    player: createPlayer(room.playerStart),
    guards: room.guards.map(createGuard),
    noiseRadius: 0,
    upWasHeld: false,
    stats: { timesSpotted: 0 },
  };
}

export function stepWorld(world, intent, dt) {
  const { player, room } = world;

  // Up acts once per press, not every frame it is held.
  if (intent.up && !world.upWasHeld) toggleHide(player, room.hideSpots);
  world.upWasHeld = intent.up;

  updatePlayer(player, intent, dt, room.width);
  world.noiseRadius = noiseRadius(player.mode);

  for (const guard of world.guards) {
    updateGuard(guard, dt);
    const sees = guardSeesPlayer(guard, player);
    if (sees && !guard.seesPlayer) world.stats.timesSpotted += 1;
    guard.seesPlayer = sees;
  }
  world.time += dt;
}
