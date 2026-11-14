// Everything drawn for one run of the game, under a single group so a restart can swap it out.
import { Group } from '../../vendor/three.module.js';
import { spotById } from '../game/hiding.js';
import { createDebugView } from './debug-view.js';
import { createGuardView } from './guard-view.js';
import { createPlayerView } from './player-view.js';
import { createRoomView } from './room-view.js';

// Draws the room the player is in. main.js builds a new one each time the player changes room.
// options.clock: false leaves the wall clocks out.
export function createGameView(world, options = {}) {
  const root = new Group();
  const roomId = world.room.id;
  const here = (thing) => thing.roomId === roomId;
  const roomView = createRoomView(world.room, world.cameras.filter(here), world.snitches.filter(here), options);
  const playerView = createPlayerView();
  const guardViews = world.guards.map(() => createGuardView(root));
  const debugView = createDebugView(world);
  root.add(roomView.group, playerView.group, debugView.group);

  // far is 0 with the camera close and 1 with it pulled right back.
  function update(debug, far = 0) {
    roomView.update(world, far);
    playerView.update(world.player, spotById(world.room.hideSpots ?? [], world.player.hiddenIn));
    world.guards.forEach((guard, i) => guardViews[i].update(guard, far, world.time));
    debugView.update(world, debug);
  }

  // Frees the GPU memory held by this run's blocks.
  function dispose() {
    roomView.dispose();
    root.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
  }
  // Which guards this view was built for. A guard on a radio check can walk in or out.
  const guardKey = world.guards.map((guard) => guard.id).join();
  return { root, roomId, guardKey, update, dispose };
}
