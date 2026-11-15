// Everything drawn for one run of the game, under a single group so a restart can swap it out.
import { Group } from '../../vendor/three.module.js';
import { spotById } from '../game/hiding.js';
import { sightBlockers } from '../game/sight.js';
import { throwArc } from '../game/throwing.js';
import { block } from './blocks.js';
import { createDebugView } from './debug-view.js';
import { createGuardView } from './guard-view.js';
import { createPlayerView } from './player-view.js';
import { createRoomView, throwableBlock } from './room-view.js';

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
  const blockers = sightBlockers(world.room);

  // The dotted arc shown while aiming a throw, and the things in the air.
  const dots = Array.from({ length: 16 }, () => block(0.09, 0.09, 0.09, 0xffffff, 0xcfd8e8));
  const flying = new Map();
  root.add(...dots);

  function updateThrows() {
    const arc = world.aiming ? throwArc(world) : [];
    dots.forEach((dot, i) => {
      // Spread the dots evenly along the arc. The last one marks where it lands.
      const point = arc[Math.round((i / (dots.length - 1)) * (arc.length - 1))];
      dot.visible = Boolean(point);
      if (point) dot.position.set(point.x, point.y, 0.2);
      dot.scale.setScalar(i === dots.length - 1 ? 2.2 : 1);
    });
    for (const thing of world.thrown) {
      if (!flying.has(thing)) {
        flying.set(thing, throwableBlock(thing.item.type));
        root.add(flying.get(thing));
      }
      const mesh = flying.get(thing);
      mesh.position.set(thing.x, thing.y + 0.1, 0.2);
      mesh.rotation.z -= 0.3;
    }
    for (const [thing, mesh] of flying) {
      if (world.thrown.includes(thing)) continue;
      root.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      flying.delete(thing);
    }
  }

  // far is 0 with the camera close and 1 with it pulled right back.
  function update(debug, far = 0) {
    roomView.update(world, far);
    playerView.update(world.player, spotById(world.room.hideSpots ?? [], world.player.hiddenIn), world.time);
    world.guards.forEach((guard, i) => guardViews[i].update(guard, far, world.time, blockers));
    updateThrows();
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
