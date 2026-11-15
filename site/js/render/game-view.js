// Everything drawn for one run of the game, under a single group so a restart can swap it out.
import {
  BackSide, BoxGeometry, BufferGeometry, Group, LineBasicMaterial, LineLoop, Mesh, MeshBasicMaterial, Vector3,
} from '../../vendor/three.module.js';
import { spotById } from '../game/hiding.js';
import { lastSeenMarkers } from '../game/lastseen.js';
import { playerLook } from '../game/visibility.js';
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

  // How loud you are: a faint ring round the player as far as your footsteps carry, always
  // shown, and a ring that fades for each one-off noise (a landing, a cup, a slammed door).
  const circle = () => {
    const points = Array.from({ length: 48 }, (_, i) => (
      new Vector3(Math.cos((i / 48) * Math.PI * 2), Math.sin((i / 48) * Math.PI * 2), 0)
    ));
    const material = new LineBasicMaterial({ color: 0x9fe8b4, transparent: true, opacity: 0.35 });
    return new LineLoop(new BufferGeometry().setFromPoints(points), material);
  };
  const noiseRing = circle();
  const pingRings = Array.from({ length: 4 }, circle);
  root.add(noiseRing, ...pingRings);

  function updateNoise(debug) {
    const radius = world.noiseRadius;
    noiseRing.visible = radius > 0;
    noiseRing.position.set(world.player.x, (world.player.y ?? 0) + 0.2, 0.6);
    noiseRing.scale.setScalar(radius || 1);
    noiseRing.material.opacity = debug ? 0.9 : 0.35;
    const recent = world.pings.slice(-pingRings.length);
    pingRings.forEach((ring, i) => {
      const ping = recent[i];
      ring.visible = Boolean(ping);
      if (!ping) return;
      const age = (world.time - ping.at) / 0.5;
      ring.position.set(ping.x, ping.y + 0.2, 0.6);
      ring.scale.setScalar(ping.radius * (0.6 + 0.4 * age));
      ring.material.opacity = 0.5 * (1 - age);
    });
  }

  // "Last seen" ghosts: a faint outline of the player where each hunting guard thinks they are.
  // One ghost per guard. It fades out when that guard stops hunting.
  const ghosts = world.guards.map(() => {
    const ghost = new Group();
    const material = new MeshBasicMaterial({ color: 0xbcd4ff, transparent: true, opacity: 0, depthWrite: false });
    const frame = new MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0, side: BackSide });
    for (const [width, height, y] of [[0.6, 1.3, 0.65], [0.36, 0.36, 1.5]]) {
      const part = new Mesh(new BoxGeometry(width, height, 0.3), material);
      part.position.y = y;
      const edge = new Mesh(new BoxGeometry(width + 0.08, height + 0.08, 0.38), frame);
      edge.position.y = y;
      ghost.add(part, edge);
    }
    ghost.userData = { material, frame, shown: 0 };
    root.add(ghost);
    return ghost;
  });

  function updateGhosts(dt) {
    const markers = lastSeenMarkers(world);
    world.guards.forEach((guard, i) => {
      const ghost = ghosts[i];
      const marker = markers.find((entry) => entry.guardId === guard.id);
      const data = ghost.userData;
      // It appears at once and moves at once. Only its going away is a fade.
      if (marker) {
        data.shown = 1;
        ghost.position.set(marker.x, marker.y, 0.1);
      } else {
        data.shown = Math.max(0, data.shown - dt * 2);
      }
      ghost.visible = data.shown > 0;
      data.material.opacity = 0.16 * data.shown;
      data.frame.opacity = 0.5 * data.shown;
    });
  }
  let lastTime = world.time;

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
    const spot = spotById(world.room.hideSpots ?? [], world.player.hiddenIn);
    playerView.update(world.player, spot, world.time, playerLook(world));
    updateGhosts(Math.max(0, world.time - lastTime));
    lastTime = world.time;
    world.guards.forEach((guard, i) => guardViews[i].update(guard, far, world.time, blockers));
    updateThrows();
    updateNoise(debug);
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
