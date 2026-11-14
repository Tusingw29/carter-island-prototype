// Builds the blocks for a room: floor, walls, cells, ways out, hiding spots, items, and cameras.
import { Group } from '../../vendor/three.module.js';
import { block, placed } from './blocks.js';
import { createCameraView } from './camera-view.js';
import { createPortalView } from './portal-views.js';
import { createSpotView } from './spot-views.js';
import { ductCeiling, grateView, weldedVentView } from './vent-views.js';

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

// A tool lying on a crate against the back wall.
function toolView(item) {
  const group = new Group();
  group.add(placed(block(0.9, 0.6, 0.7, 0x5a4a34), item.x, 0.3, WALL_Z + 0.5));
  group.add(placed(block(0.2, 0.08, 0.08, 0xd9c23a, 0x6a5a10), item.x - 0.2, 0.65, WALL_Z + 0.6));
  group.add(placed(block(0.4, 0.04, 0.04, 0xc8ccd4, 0x30343a), item.x + 0.1, 0.65, WALL_Z + 0.6));
  return group;
}

const ITEM_VIEWS = { keycard: keycardView, screwdriver: toolView };

export function createRoomView(room, cameras) {
  const group = new Group();
  group.add(shell(room));
  for (const x of room.cellXs ?? []) group.add(cellFront(x));
  const liveViews = [];
  for (const portal of room.portals ?? []) {
    const view = createPortalView(room, portal);
    if (view.userData.update) liveViews.push(view);
    group.add(view);
  }
  for (const prop of room.props ?? []) group.add(weldedVentView(prop));
  for (const grate of room.grates ?? []) group.add(grateView(grate));
  if (room.crawl) group.add(ductCeiling(room));

  const spotViews = new Map();
  for (const spot of room.hideSpots ?? []) {
    const view = createSpotView(spot);
    spotViews.set(spot.id, view);
    group.add(view);
  }
  const itemViews = (room.items ?? []).map((item) => ({ item, view: ITEM_VIEWS[item.type](item) }));
  for (const { view } of itemViews) group.add(view);
  const cameraViews = cameras.map((camera) => ({ camera, view: createCameraView(camera) }));
  for (const { view } of cameraViews) group.add(view.group);

  function update(world) {
    for (const [id, view] of spotViews) {
      const holdsBody = world.allGuards.some((guard) => guard.hiddenIn === id);
      const glow = world.player.hiddenIn === id ? PLAYER_GLOW : 0;
      view.userData.setOccupied(holdsBody ? BODY_GLOW : glow);
    }
    for (const { item, view } of itemViews) {
      view.visible = !(world.taken.has(item.id) || (item.type === 'keycard' && world.player.hasKeycard));
    }
    for (const view of liveViews) view.userData.update(world);
    for (const { camera, view } of cameraViews) view.update(camera);
  }
  return { group, update };
}
