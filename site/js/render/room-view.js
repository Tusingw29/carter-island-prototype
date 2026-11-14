// Builds the blocks for a room: floor, walls, cells, ways out, hiding spots, items, and cameras.
import { Group } from '../../vendor/three.module.js';
import { block, placed } from './blocks.js';
import { createCameraView } from './camera-view.js';
import { createPortalView } from './portal-views.js';
import { createSpotView } from './spot-views.js';

const WALL_Z = -2;
const WALL_HEIGHT = 4.6;
const PLAYER_GLOW = 0xd98a3a;
const BODY_GLOW = 0x3a5a9a;

function cellFront(x) {
  const group = new Group();
  group.add(placed(block(2.4, 2.7, 0.1, 0x07090d), x, 1.35, WALL_Z + 0.06));
  for (let i = -2; i <= 2; i += 1) {
    group.add(placed(block(0.07, 2.7, 0.07, 0x5d6672), x + i * 0.5, 1.35, WALL_Z + 0.15));
  }
  return group;
}

function shell(room) {
  const group = new Group();
  const centre = room.width / 2;
  const span = room.width + 2;
  const wall = room.wallColor ?? 0x3b4452;
  group.add(placed(block(span, 0.5, 4.2, 0x2b313b), centre, -0.25, -0.2));
  group.add(placed(block(span, WALL_HEIGHT, 0.4, wall), centre, WALL_HEIGHT / 2, WALL_Z - 0.2));
  group.add(placed(block(0.5, WALL_HEIGHT, 4.2, 0x323a46), -0.25, WALL_HEIGHT / 2, -0.2));
  group.add(placed(block(0.5, WALL_HEIGHT, 4.2, 0x323a46), room.width + 0.25, WALL_HEIGHT / 2, -0.2));
  // A stripe along the wall gives the eye something to judge speed against.
  group.add(placed(block(span, 0.12, 0.05, 0x56606e), centre, 3.4, WALL_Z + 0.03));
  return group;
}

function keycardView(item) {
  return placed(block(0.34, 0.04, 0.22, 0xe8f0ff, 0x7fd0a0), item.x, 1.11, 0.2);
}

export function createRoomView(room, cameras) {
  const group = new Group();
  group.add(shell(room));
  for (const x of room.cellXs ?? []) group.add(cellFront(x));
  for (const portal of room.portals ?? []) group.add(createPortalView(room, portal));

  const spotViews = new Map();
  for (const spot of room.hideSpots ?? []) {
    const view = createSpotView(spot);
    spotViews.set(spot.id, view);
    group.add(view);
  }
  const itemViews = (room.items ?? []).map((item) => ({ item, view: keycardView(item) }));
  for (const { view } of itemViews) group.add(view);
  const cameraViews = cameras.map((camera) => ({ camera, view: createCameraView(camera) }));
  for (const { view } of cameraViews) group.add(view.group);

  function update(world) {
    for (const [id, view] of spotViews) {
      const holdsBody = world.allGuards.some((guard) => guard.hiddenIn === id);
      const glow = world.player.hiddenIn === id ? PLAYER_GLOW : 0;
      view.userData.setOccupied(holdsBody ? BODY_GLOW : glow);
    }
    for (const { item, view } of itemViews) view.visible = !(item.type === 'keycard' && world.player.hasKeycard);
    for (const { camera, view } of cameraViews) view.update(camera);
  }
  return { group, update };
}
