// Things only the Yard has: chain-link fences, ladders, guard towers, the shed, basketball
// hoops, the searchlights, and the outer wall.
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from '../../vendor/three.module.js';
import { cameraLit, cameraMount, cameraSweep, poolSlices } from '../game/camera.js';
import { block, placed } from './blocks.js';
import { fanMesh, setFan } from './guard-view.js';

const WALL_Z = -2;
const STEEL = 0x56606e;
const DARK_STEEL = 0x2a2e36;

// Chain-link: a see-through sheet across the lane with a post at each end and a rail on top.
export function fenceView(solid) {
  const group = new Group();
  const height = solid.top - solid.bottom;
  const mesh = block(0.05, height, 3, 0x9aa6b6, 0x30363e);
  mesh.material.transparent = true;
  mesh.material.opacity = 0.3;
  mesh.material.depthWrite = false;
  group.add(placed(mesh, solid.x, solid.bottom + height / 2, -0.3));
  for (const z of [-1.8, 1.2]) group.add(placed(block(0.14, height + 0.1, 0.14, STEEL), solid.x, height / 2, z));
  group.add(placed(block(0.2, 0.08, 3.1, 0xb8c2d0, 0x30363e), solid.x, solid.top - 0.04, -0.3));
  return group;
}

export function ladderView(ladder) {
  const group = new Group();
  const height = ladder.top - ladder.bottom;
  for (const side of [-0.28, 0.28]) {
    const rail = block(0.07, height + 0.5, 0.07, 0xb8a060, 0x3a3010);
    group.add(placed(rail, ladder.x + side, ladder.bottom + height / 2, 0.75));
  }
  for (let y = ladder.bottom + 0.3; y < ladder.top; y += 0.4) {
    group.add(placed(block(0.6, 0.05, 0.05, 0xb8a060, 0x3a3010), ladder.x, y, 0.75));
  }
  return group;
}

// The legs, rail, and lamp of a guard tower. Its platform is one of the room's solids.
export function towerView(tower) {
  const group = new Group();
  for (const dx of [-1.8, 1.8]) {
    for (const z of [-0.9, 0.6]) {
      group.add(placed(block(0.16, tower.top, 0.16, DARK_STEEL), tower.x + dx, tower.top / 2, z));
    }
  }
  group.add(placed(block(4, 0.08, 0.08, STEEL), tower.x, tower.top + 1, -1));
  for (const dx of [-2, 2]) group.add(placed(block(0.08, 1, 0.08, STEEL), tower.x + dx, tower.top + 0.5, -1));
  // The roof over the guard's head, and the arm the lamp hangs from.
  group.add(placed(block(4.4, 0.14, 2, DARK_STEEL), tower.x, tower.lampY + 0.5, -0.2));
  const post = tower.lampY + 0.5 - tower.top;
  group.add(placed(block(0.1, post, 0.1, DARK_STEEL), tower.x + 1.9, tower.top + post / 2, -1));
  return group;
}

// The shed stands against the back wall. Its roof is one of the room's solids.
export function shedView(shed) {
  const group = new Group();
  const width = shed.to - shed.from;
  const middle = (shed.from + shed.to) / 2;
  group.add(placed(block(width - 0.3, shed.height, 0.06, 0x4a4436), middle, shed.height / 2, WALL_Z + 0.03));
  for (let x = shed.from + 0.6; x < shed.to; x += 0.9) {
    group.add(placed(block(0.05, shed.height, 0.02, 0x3a352a), x, shed.height / 2, WALL_Z + 0.07));
  }
  return group;
}

// The pole and backboard of a basketball hoop. The parts you can stand on are solids.
export function hoopView(hoop) {
  const group = new Group();
  group.add(placed(block(0.14, 3.3, 0.14, STEEL), hoop.x + 0.25, 1.65, -1.4));
  group.add(placed(block(0.1, 1, 1.3, 0xd8dde4, 0x2a2e36), hoop.x, 2.8, -0.9));
  group.add(placed(block(0.5, 0.05, 0.5, 0xd9702a, 0x5a2a08), hoop.x + hoop.facing * 0.35, 2.3, -0.9));
  return group;
}

// The light pole on the court. Its top is one of the room's solids.
export function poleView(x, top) {
  const group = new Group();
  group.add(placed(block(0.14, top - 0.25, 0.14, STEEL), x, (top - 0.25) / 2, -1.2));
  return group;
}

// The outer wall at the far end: much too high.
export function outerWallView(room, height = 11) {
  const group = new Group();
  group.add(placed(block(1.2, height, 4.4, 0x3a4048), room.width + 0.6, height / 2, -0.2));
  for (let y = 1.5; y < height; y += 1.5) {
    group.add(placed(block(0.05, 0.06, 4.4, 0x2a2e36), room.width - 0.02, y, -0.2));
  }
  // Coils of wire along the top.
  group.add(placed(block(1.4, 0.3, 4.4, 0x8a94a0, 0x20242a), room.width + 0.6, height + 0.15, -0.2));
  return group;
}

const LIGHT = 0xfff0b0;
const SEEN = 0xff4a3c;
const SLICES = 16;

function floorPatch(color, opacity) {
  const material = new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const mesh = new Mesh(new PlaneGeometry(1, 3.8), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 2;
  return mesh;
}

// A searchlight: the lamp on the tower, its beam, the pool of light on the ground (dark where
// cover shades it), and a faint glow just ahead of the pool to warn that it is coming.
export function createSearchlightView(light) {
  const group = new Group();
  const mount = cameraMount(light);
  const lamp = placed(block(0.5, 0.4, 0.5, 0x2a2e36, LIGHT), mount.x, mount.y + 0.1, -0.2);
  const beam = fanMesh(LIGHT, 0.07);
  const slices = Array.from({ length: SLICES }, () => floorPatch(LIGHT, 0.42));
  const warning = floorPatch(LIGHT, 0.1);
  group.add(lamp, beam, warning, ...slices);

  function update(state, far = 0, blockers = [], time = 0) {
    const on = !state.off;
    const sweep = cameraSweep(state, time);
    beam.visible = on && !sweep.away;
    warning.visible = on;
    lamp.material.emissive.setHex(on ? (state.sees ? SEEN : LIGHT) : 0x000000);
    if (on && sweep.away) {
      // Swung away off the ground. The glow where it will land grows as it comes back.
      for (const slice of slices) slice.visible = false;
      warning.scale.x = state.halfWidth * 2;
      warning.position.set(sweep.x, 0.025, -0.1);
      warning.material.opacity = 0.05 + 0.25 * Math.max(0, 1 - sweep.backIn / 1.5);
      return;
    }
    if (!on) {
      for (const slice of slices) slice.visible = false;
      return;
    }
    const color = state.sees ? SEEN : LIGHT;
    setFan(beam, cameraLit(state, blockers), 0.25);
    beam.material.color.setHex(color);
    beam.material.opacity = 0.07 * (1 + 0.6 * far);
    const width = (state.halfWidth * 2) / SLICES;
    poolSlices(state, blockers, SLICES).forEach((lit, i) => {
      const slice = slices[i];
      slice.visible = lit;
      slice.scale.x = width;
      slice.position.set(state.x - state.halfWidth + (i + 0.5) * width, 0.03, -0.1);
      slice.material.color.setHex(color);
    });
    // The warning glow: on the ground the pool is about to cross.
    warning.scale.x = 2.6;
    warning.material.opacity = 0.1;
    warning.position.set(state.x + sweep.heading * (state.halfWidth + 1.3), 0.025, -0.1);
  }
  return { group, update };
}
