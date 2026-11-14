// Everything drawn for one run of the game, under a single group so a restart can swap it out.
import { Group } from '../../vendor/three.module.js';
import { spotById } from '../game/hiding.js';
import { createDebugView } from './debug-view.js';
import { createGuardView } from './guard-view.js';
import { createPlayerView } from './player-view.js';
import { createRoomView } from './room-view.js';

// Draws the room the player is in. main.js builds a new one each time the player changes room.
export function createGameView(world) {
  const root = new Group();
  const roomId = world.room.id;
  const here = (thing) => thing.roomId === roomId;
  const roomView = createRoomView(world.room, world.cameras.filter(here), world.snitches.filter(here));
  const playerView = createPlayerView();
  const guardViews = world.guards.map(() => createGuardView(root));
  const debugView = createDebugView(world);
  root.add(roomView.group, playerView.group, debugView.group);

  function update(debug) {
    roomView.update(world);
    playerView.update(world.player, spotById(world.room.hideSpots ?? [], world.player.hiddenIn));
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
  return { root, roomId, update, dispose };
}
