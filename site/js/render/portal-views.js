// Blocks for the ways out of a room: hall archways, stairs, doors, and vents.
// A view may have userData.update(world) if its look depends on the game state.
import { Group } from '../../vendor/three.module.js';
import { block, placed } from './blocks.js';
import { ventView } from './vent-views.js';

const WALL_Z = -2;
const OPENING = 0x030406;

// An open archway at the end of the room.
function hall(room, portal) {
  const group = new Group();
  const x = portal.side === 'left' ? 0.9 : room.width - 0.9;
  group.add(placed(block(1.7, 3, 0.1, OPENING), x, 1.5, WALL_Z + 0.06));
  group.add(placed(block(2, 0.2, 0.2, 0x6b7480), x, 3.1, WALL_Z + 0.1));
  return group;
}

// A dark stairwell opening with a few steps going up or down.
function stairs(room, portal) {
  const group = new Group();
  group.add(placed(block(1.9, 2.8, 0.1, OPENING), portal.x, 1.4, WALL_Z + 0.06));
  const rising = portal.dir === 'up';
  for (let i = 0; i < 4; i += 1) {
    const height = rising ? 0.25 * (i + 1) : 0.25 * (4 - i);
    group.add(placed(block(0.42, height, 0.5, 0x59626e), portal.x - 0.63 + i * 0.42, height / 2, WALL_Z + 0.4));
  }
  return group;
}

// A door on the back wall. Creaky doors are rust colored so you learn to spot them.
function door(room, portal) {
  const group = new Group();
  const color = portal.creaky ? 0x7a4a32 : 0x5a6470;
  group.add(placed(block(1.5, 2.7, 0.08, 0x1a1e24), portal.x, 1.35, WALL_Z + 0.05));
  group.add(placed(block(1.3, 2.55, 0.1, color), portal.x, 1.3, WALL_Z + 0.1));
  group.add(placed(block(0.12, 0.12, 0.1, 0xd0c8a0), portal.x + 0.45, 1.25, WALL_Z + 0.2));
  return group;
}

// The Guard Office window. From the Yard it is up on the sill at the end of the roof ledge.
function windowView(room, portal) {
  const group = new Group();
  const base = portal.y ?? 0;
  group.add(placed(block(1.5, 1.7, 0.08, 0x6b7480), portal.x, base + 1.25, WALL_Z + 0.05));
  group.add(placed(block(1.3, 1.5, 0.1, 0x101c2c, 0x0c1a30), portal.x, base + 1.25, WALL_Z + 0.08));
  group.add(placed(block(0.06, 1.5, 0.12, 0x6b7480), portal.x, base + 1.25, WALL_Z + 0.1));
  group.add(placed(block(1.7, 0.1, 0.3, 0x8a94a0), portal.x, base + 0.42, WALL_Z + 0.15));
  return group;
}

// The shed's hatch. On the roof it is a lid at your feet. Inside it is a ladder up to the ceiling.
function hatchView(room, portal) {
  const group = new Group();
  if (portal.y > 0) {
    group.add(placed(block(1.2, 0.08, 1, 0x8a7a4a, 0x2a240c), portal.x, portal.y + 0.04, -0.2));
    group.add(placed(block(0.3, 0.06, 0.1, 0xd0c8a0), portal.x, portal.y + 0.11, 0.2));
    return group;
  }
  for (const side of [-0.28, 0.28]) {
    group.add(placed(block(0.07, 4.4, 0.07, 0xb8a060), portal.x + side, 2.2, WALL_Z + 0.3));
  }
  for (let y = 0.3; y < 4.4; y += 0.4) group.add(placed(block(0.6, 0.05, 0.05, 0xb8a060), portal.x, y, WALL_Z + 0.3));
  group.add(placed(block(1.2, 0.1, 1, 0x8a7a4a, 0x2a240c), portal.x, 4.45, WALL_Z + 0.6));
  return group;
}

const BUILDERS = { hall, stairs, door, vent: ventView, window: windowView, hatch: hatchView };

export function createPortalView(room, portal) {
  return BUILDERS[portal.type](room, portal);
}
