// Blocks for each kind of hiding spot. Each view has userData.setOccupied(glowColor or 0),
// which lights a small part of it so you can tell who is inside.
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from '../../vendor/three.module.js';
import { block, placed } from './blocks.js';

const WALL_Z = -2;
const noGlow = () => {};

function locker(spot) {
  const group = new Group();
  const slit = placed(block(0.5, 0.08, 0.05, 0x10161b), spot.x, 1.75, WALL_Z + 0.77);
  group.add(placed(block(1, 2.2, 0.7, 0x45616f), spot.x, 1.1, WALL_Z + 0.4), slit);
  group.userData.setOccupied = (glow) => slit.material.emissive.setHex(glow);
  return group;
}

function cart(spot) {
  const group = new Group();
  const z = WALL_Z + 1.1;
  const rim = placed(block(1.7, 0.08, 0.95, 0xb9b4a4), spot.x, 1.04, z);
  group.add(placed(block(1.6, 0.8, 0.9, 0x8a8f6a), spot.x, 0.6, z), rim);
  group.add(placed(block(0.15, 0.2, 0.15, 0x22262c), spot.x - 0.6, 0.1, z));
  group.add(placed(block(0.15, 0.2, 0.15, 0x22262c), spot.x + 0.6, 0.1, z));
  group.userData.setOccupied = (glow) => rim.material.emissive.setHex(glow);
  return group;
}

function bed(spot) {
  const group = new Group();
  const blanket = placed(block(1.9, 0.14, 0.9, 0x55606e), spot.x + 0.15, 0.7, WALL_Z + 0.6);
  group.add(placed(block(2.2, 0.35, 1, 0x6f6a5c), spot.x, 0.45, WALL_Z + 0.6), blanket);
  group.add(placed(block(0.5, 0.15, 0.7, 0xb9b4a4), spot.x - 0.8, 0.72, WALL_Z + 0.6));
  group.userData.setOccupied = (glow) => blanket.material.emissive.setHex(glow);
  return group;
}

// Tables and desks: a top on legs, with the walking lane running underneath.
function table(spot, topColor = 0x7a5c3e) {
  const group = new Group();
  const width = spot.halfWidth * 2;
  group.add(placed(block(width, 0.12, 1.5, topColor), spot.x, 1.02, 0));
  for (const side of [-1, 1]) {
    const legX = spot.x + side * (spot.halfWidth - 0.1);
    group.add(placed(block(0.12, 0.96, 0.12, 0x3a2c1e), legX, 0.48, -0.65));
    group.add(placed(block(0.12, 0.96, 0.12, 0x3a2c1e), legX, 0.48, 0.65));
  }
  group.userData.setOccupied = noGlow;
  return group;
}

// The checkpoint counter stands in front of the lane, so you crawl along behind it.
function counter(spot) {
  const group = new Group();
  const width = spot.halfWidth * 2;
  group.add(placed(block(width, 0.75, 0.3, 0x5a6470), spot.x, 0.375, 0.75));
  group.add(placed(block(width + 0.2, 0.08, 0.5, 0x8a94a0), spot.x, 0.79, 0.7));
  group.userData.setOccupied = noGlow;
  return group;
}

// Tool shelves stand in front of the lane. You hide behind them.
function shelf(spot) {
  const group = new Group();
  const frame = placed(block(1.8, 2.5, 0.25, 0x4a4338), spot.x, 1.25, 0.8);
  group.add(frame);
  for (const y of [0.6, 1.25, 1.9]) group.add(placed(block(1.6, 0.3, 0.3, 0x8a6a3a), spot.x, y, 0.85));
  group.userData.setOccupied = (glow) => frame.material.emissive.setHex(glow);
  return group;
}

// A pitch-dark patch: a see-through black sheet in front of that stretch of the room.
function dark(spot) {
  const group = new Group();
  const material = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.72, depthWrite: false });
  const sheet = new Mesh(new PlaneGeometry(spot.halfWidth * 2, 3.7), material);
  sheet.renderOrder = 5;
  group.add(placed(sheet, spot.x, 1.85, 0.95));
  group.add(placed(block(spot.halfWidth * 2, 0.04, 3.6, 0x05070b), spot.x, 0.02, -0.1));
  group.userData.setOccupied = noGlow;
  return group;
}

const BUILDERS = {
  locker, cart, bed, table, counter, shelf, dark, desk: (spot) => table(spot, 0x5c4a3a),
};

export function createSpotView(spot) {
  return BUILDERS[spot.type](spot);
}

// In these the player stays visible, crouched, because you can crawl along inside.
export const SEE_THROUGH_SPOTS = ['table', 'desk', 'counter'];
