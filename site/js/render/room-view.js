// Builds the blocks for a room: floor, walls, cells, ways out, hiding spots, items, and cameras.
import { Group } from '../../vendor/three.module.js';
import { sightBlockers } from '../game/sight.js';
import { isThrowable } from '../game/throwing.js';
import { block, placed } from './blocks.js';
import { createCameraView } from './camera-view.js';
import { createSnitchView, createTraderView } from './inmate-views.js';
import { createPortalView } from './portal-views.js';
import { createSignViews } from './sign-view.js';
import { createSpotView } from './spot-views.js';
import { ductCeiling, grateView, weldedVentView } from './vent-views.js';
import { createWallClock } from './wall-clock.js';

const WALL_Z = -2;
const WALL_HEIGHT = 4.6;
const PLAYER_GLOW = 0xd98a3a;
const BODY_GLOW = 0x3a5a9a;
const DUMMY_GLOW = 0x8a8a7a;

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
  // The floor, in pieces if the room has gaps in it.
  let from = -1;
  for (const pit of [...(room.pits ?? []), { from: room.width + 1, to: room.width + 1 }]) {
    group.add(placed(block(pit.from - from, 0.5, 4.2, 0x2b313b), (from + pit.from) / 2, -0.25, -0.2));
    from = pit.to;
  }
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

// Something small on a crate: a pack of cigarettes or a pile of folded sheets.
function crateView(item, color, size) {
  const group = new Group();
  group.add(placed(block(0.9, 0.6, 0.7, 0x5a4a34), item.x, 0.3, WALL_Z + 0.5));
  group.add(placed(block(size, size * 0.6, size, color, 0x303030), item.x, 0.6 + size * 0.3, WALL_Z + 0.6));
  return group;
}

// What each throwable looks like: [width, height, depth, color, glow].
export const THROWABLE_LOOKS = {
  cup: [0.16, 0.2, 0.16, 0xd8dde4, 0x4a5058],
  mug: [0.18, 0.2, 0.18, 0xb8502c, 0x4a1c0c],
  soap: [0.26, 0.12, 0.16, 0xe8c8d8, 0x5a3a4a],
  can: [0.2, 0.26, 0.2, 0x9aa23a, 0x3a3e10],
  basketball: [0.34, 0.34, 0.34, 0xd9702a, 0x5a2a08],
};

export function throwableBlock(type) {
  const [width, height, depth, color, glow] = THROWABLE_LOOKS[type];
  return block(width, height, depth, color, glow);
}

// A throwable on a stool by the back wall, glowing a little so it can be found in the dark.
function throwableView(item) {
  const group = new Group();
  const base = item.y ?? 0;
  const height = THROWABLE_LOOKS[item.type][1];
  // One that sits up on a crate needs no stool.
  if (base > 0) return group.add(placed(throwableBlock(item.type), item.x, base + height / 2, -0.5));
  group.add(placed(block(0.5, 0.45, 0.5, 0x4a4338), item.x, 0.225, WALL_Z + 0.9));
  group.add(placed(throwableBlock(item.type), item.x, 0.45 + height / 2, WALL_Z + 0.9));
  return group;
}

// The camera control panel: a box on the wall with a light that is green while the camera is on.
function panelView(prop) {
  const group = new Group();
  const light = placed(block(0.16, 0.16, 0.06, 0x111111, 0x20aa40), prop.x, 1.75, WALL_Z + 0.16);
  group.add(placed(block(0.9, 1.1, 0.14, 0x56606e), prop.x, 1.4, WALL_Z + 0.07), light);
  group.add(placed(block(0.5, 0.3, 0.05, 0x10161b, 0x1a3a5a), prop.x, 1.25, WALL_Z + 0.16));
  group.userData.update = (world) => {
    const camera = world.cameras.find((entry) => entry.id === prop.controls);
    light.material.emissive.setHex(camera.off ? 0xaa2020 : 0x20aa40);
  };
  return group;
}

// Gym furniture: crates to climb, a ledge, and a wall with a low gap under it.
const SOLID_COLORS = { crate: 0x6a5436, ledge: 0x56606e, wall: 0x39424e };
function solidView(solid) {
  const height = solid.top - solid.bottom;
  const view = block(solid.halfWidth * 2, height, 1.7, SOLID_COLORS[solid.kind] ?? 0x56606e, 0x0c0e12);
  return placed(view, solid.x, solid.bottom + height / 2, -0.15);
}

const ITEM_VIEWS = {
  keycard: keycardView,
  screwdriver: toolView,
  cigarettes: (item) => crateView(item, 0xe8e0d0, 0.22),
  bedsheets: (item) => crateView(item, 0xd8d8e0, 0.6),
};

// options.clock: false leaves the wall clocks out.
export function createRoomView(room, cameras, snitches, options = {}) {
  const group = new Group();
  group.add(shell(room));
  for (const x of room.cellXs ?? []) group.add(cellFront(x));
  const liveViews = [];
  for (const portal of room.portals ?? []) {
    const view = createPortalView(room, portal);
    if (view.userData.update) liveViews.push(view);
    group.add(view);
  }
  for (const prop of room.props ?? []) {
    const view = prop.type === 'camera-panel' ? panelView(prop) : weldedVentView(prop);
    if (view.userData.update) liveViews.push(view);
    group.add(view);
  }
  for (const solid of room.solids ?? []) group.add(solidView(solid));
  const signs = createSignViews(room);
  group.add(signs.group);
  if (room.trader) group.add(createTraderView(room.trader));
  for (const grate of room.grates ?? []) group.add(grateView(grate));
  if (room.crawl) group.add(ductCeiling(room));
  const wallClock = options.clock === false ? null : createWallClock(room, cameras);
  if (wallClock) group.add(wallClock.group);

  const spotViews = new Map();
  for (const spot of room.hideSpots ?? []) {
    const view = createSpotView(spot);
    spotViews.set(spot.id, view);
    group.add(view);
  }
  const viewFor = (item) => (isThrowable(item) ? throwableView(item) : ITEM_VIEWS[item.type](item));
  const itemViews = (room.items ?? []).map((item) => ({ item, view: viewFor(item) }));
  for (const { view } of itemViews) group.add(view);
  const cameraViews = cameras.map((camera) => ({ camera, view: createCameraView(camera) }));
  for (const { view } of cameraViews) group.add(view.group);
  const snitchViews = snitches.map((snitch) => ({ snitch, view: createSnitchView(snitch) }));
  for (const { view } of snitchViews) group.add(view.group);

  // far is 0 with the camera close and 1 with it pulled right back.
  function update(world, far = 0) {
    wallClock?.update(world);
    for (const [id, view] of spotViews) {
      const holdsBody = world.allGuards.some((guard) => guard.hiddenIn === id);
      let glow = holdsBody ? BODY_GLOW : 0;
      // The dummy shows as a pale lump in the bed while you are out of it.
      if (id === 'bed' && world.dummyInBed) glow = DUMMY_GLOW;
      if (world.player.hiddenIn === id) glow = PLAYER_GLOW;
      view.userData.setOccupied(glow);
    }
    for (const { item, view } of itemViews) {
      view.visible = !(world.taken.has(item.id) || (item.type === 'keycard' && world.player.hasKeycard));
    }
    for (const view of liveViews) view.userData.update(world);
    const blockers = sightBlockers(room);
    for (const { camera, view } of cameraViews) view.update(camera, far, blockers);
    for (const { snitch, view } of snitchViews) view.update(snitch);
  }
  const dispose = () => {
    wallClock?.dispose();
    signs.dispose();
  };
  return { group, update, dispose };
}
