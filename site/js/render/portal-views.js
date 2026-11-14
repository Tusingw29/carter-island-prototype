// Blocks for the ways out of a room: hall archways, stairs, and doors.
import { Group } from '../../vendor/three.module.js';
import { block, placed } from './blocks.js';

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

const BUILDERS = { hall, stairs, door };

export function createPortalView(room, portal) {
  return BUILDERS[portal.type](room, portal);
}
