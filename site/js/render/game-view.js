// Everything drawn for one run of the game, under a single group so a restart can swap it out.
import { Group } from '../../vendor/three.module.js';
import { createDebugView } from './debug-view.js';
import { createGuardView } from './guard-view.js';
import { createPlayerView } from './player-view.js';
import { createRoomView } from './room-view.js';

export function createGameView(world) {
  const root = new Group();
  const roomView = createRoomView(world.room);
  const playerView = createPlayerView();
  const guardViews = world.guards.map(() => createGuardView(root));
  const debugView = createDebugView(world);
  root.add(roomView.group, playerView.group, debugView.group);

  function update(debug) {
    roomView.update(world);
    playerView.update(world.player);
    world.guards.forEach((guard, i) => guardViews[i].update(guard));
    debugView.update(world, debug);
  }

  // Frees the GPU memory held by this run's blocks.
  function dispose() {
    root.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
  }
  return { root, update, dispose };
}
