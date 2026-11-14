// Blocks for vent covers, the welded vent, and the grates in the duct floor.
import { Group } from '../../vendor/three.module.js';
import { ventState } from '../game/vents.js';
import { block, placed } from './blocks.js';

const WALL_Z = -2;
const LOCKED = 0xffb03a;
const OPEN = 0x6ab0ff;

function slats(group, x, y, z, flat) {
  for (let i = -2; i <= 2; i += 1) {
    const slat = flat ? block(1, 0.03, 0.07, 0x1a1e24) : block(1, 0.05, 0.04, 0x1a1e24);
    group.add(placed(slat, x, flat ? y + 0.03 : y + i * 0.12, flat ? z + i * 0.13 : z + 0.06));
  }
}

// A vent cover. Screwed-shut covers have bright amber screws so you notice them and come back.
// Once you can open one, its screws turn blue.
export function ventView(room, portal) {
  const group = new Group();
  const flat = Boolean(portal.floor);
  const y = flat ? 0.03 : (portal.high ? 3.5 : 0.75);
  const z = flat ? 0 : WALL_Z + 0.05;
  const cover = flat ? block(1.3, 0.05, 0.9, 0x6b7480) : block(1.3, 0.8, 0.08, 0x6b7480);
  group.add(placed(cover, portal.x, y, z));
  slats(group, portal.x, y, z, flat);
  const screws = [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]].map(([dx, d]) => {
    const screw = block(0.1, 0.1, 0.1, 0x222222, LOCKED);
    group.add(placed(screw, portal.x + dx, flat ? y + 0.04 : y + d, flat ? z + d : z + 0.07));
    return screw;
  });
  group.userData.update = (world) => {
    const state = ventState(world, portal);
    for (const screw of screws) {
      screw.visible = state !== 'exitOnly';
      screw.material.emissive.setHex(state === 'locked' ? LOCKED : OPEN);
    }
  };
  return group;
}

// The welded vent: darker, with a bead of orange weld right round the edge.
export function weldedVentView(prop) {
  const group = new Group();
  const z = WALL_Z + 0.05;
  group.add(placed(block(1.5, 1, 0.08, 0x3a3f46), prop.x, 0.8, z));
  slats(group, prop.x, 0.8, z, false);
  const weld = 0xc8641e;
  group.add(placed(block(1.6, 0.09, 0.1, weld, 0x5a2a08), prop.x, 1.32, z + 0.03));
  group.add(placed(block(1.6, 0.09, 0.1, weld, 0x5a2a08), prop.x, 0.28, z + 0.03));
  group.add(placed(block(0.09, 1.1, 0.1, weld, 0x5a2a08), prop.x - 0.78, 0.8, z + 0.03));
  group.add(placed(block(0.09, 1.1, 0.1, weld, 0x5a2a08), prop.x + 0.78, 0.8, z + 0.03));
  return group;
}

// A grate in the duct floor, lit from the room below.
export function grateView(grate) {
  const group = new Group();
  group.add(placed(block(1.4, 0.04, 1, 0x2a2e36, 0x6a5a2a), grate.x, 0.03, 0));
  slats(group, grate.x, 0.03, 0, true);
  return group;
}

// The low duct ceiling that makes the crawl space feel tight.
export function ductCeiling(room) {
  return placed(block(room.width + 2, 3, 4.2, 0x2a2e36), room.width / 2, 1.35 + 1.5, -0.2);
}
