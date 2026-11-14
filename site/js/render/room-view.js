// Builds the blocks for a room: floor, back wall, cells, bed, and hiding spots.
import { Group } from '../../vendor/three.module.js';
import { block, placed } from './blocks.js';

const WALL_Z = -2;
const WALL_HEIGHT = 4.6;

function cellFront(x) {
  const group = new Group();
  group.add(placed(block(2.4, 2.7, 0.1, 0x07090d), x, 1.35, WALL_Z + 0.06));
  for (let i = -2; i <= 2; i += 1) {
    group.add(placed(block(0.07, 2.7, 0.07, 0x5d6672), x + i * 0.5, 1.35, WALL_Z + 0.15));
  }
  return group;
}

function lockerView(spot) {
  const group = new Group();
  const body = placed(block(1, 2.2, 0.7, 0x45616f), spot.x, 1.1, WALL_Z + 0.4);
  const slit = placed(block(0.5, 0.08, 0.05, 0x10161b), spot.x, 1.75, WALL_Z + 0.77);
  group.add(body, slit);
  // The slit lights up while you are inside, so you can tell where you are.
  group.userData.setOccupied = (occupied) => slit.material.emissive.setHex(occupied ? 0xd98a3a : 0x000000);
  return group;
}

export function createRoomView(room) {
  const group = new Group();
  const centre = room.width / 2;
  const span = room.width + 2;

  group.add(placed(block(span, 0.5, 4.2, 0x2b313b), centre, -0.25, -0.2));
  group.add(placed(block(span, WALL_HEIGHT, 0.4, 0x3b4452), centre, WALL_HEIGHT / 2, WALL_Z - 0.2));
  group.add(placed(block(0.5, WALL_HEIGHT, 4.2, 0x323a46), -0.25, WALL_HEIGHT / 2, -0.2));
  group.add(placed(block(0.5, WALL_HEIGHT, 4.2, 0x323a46), room.width + 0.25, WALL_HEIGHT / 2, -0.2));
  // A stripe along the wall gives the eye something to judge speed against.
  group.add(placed(block(span, 0.12, 0.05, 0x56606e), centre, 3.2, WALL_Z + 0.03));

  for (const x of room.cellXs) group.add(cellFront(x));
  group.add(placed(block(1.9, 0.35, 0.9, 0x6f6a5c), room.bedX, 0.45, WALL_Z + 0.6));
  group.add(placed(block(0.5, 0.15, 0.7, 0xb9b4a4), room.bedX - 0.6, 0.7, WALL_Z + 0.6));

  const spotViews = new Map();
  for (const spot of room.hideSpots) {
    const view = lockerView(spot);
    spotViews.set(spot.id, view);
    group.add(view);
  }

  function update(world) {
    for (const [id, view] of spotViews) view.userData.setOccupied(world.player.hiddenIn === id);
  }
  return { group, update };
}
