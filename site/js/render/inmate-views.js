// Draws the inmates in their cells: snitches, with the stretch of floor each is watching,
// and the trader.
import {
  BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial,
} from '../../vendor/three.module.js';
import { snitchWindow } from '../game/snitch.js';
import { block, placed } from './blocks.js';

const WALL_Z = -2;
const CELL_Z = WALL_Z + 0.1;
const WATCHING = 0xc77dff;
const SEEN = 0xff4a3c;

function inmate(x, capColor) {
  const group = new Group();
  group.add(placed(block(0.6, 1.25, 0.03, 0xb86a2a, 0x3a2008), x, 0.65, CELL_Z));
  group.add(placed(block(0.34, 0.34, 0.03, 0xd8b890, 0x2a2118), x, 1.47, CELL_Z));
  group.add(placed(block(0.38, 0.1, 0.04, capColor, capColor), x, 1.68, CELL_Z));
  return group;
}

export function createSnitchView(snitch) {
  const group = new Group();
  const body = inmate(snitch.x, 0x8a3ad0);
  // The lamp over the cell door: red while locked, green once you have opened it.
  const lamp = placed(block(0.2, 0.12, 0.1, 0x111111, 0xaa2020), snitch.x, 2.9, WALL_Z + 0.2);
  group.add(body, lamp);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
  const material = new MeshBasicMaterial({
    color: WATCHING, transparent: true, opacity: 0.2, side: DoubleSide, depthWrite: false,
  });
  const view = new Mesh(geometry, material);
  view.frustumCulled = false;
  group.add(view);

  function update(state) {
    const out = state.state === 'out';
    view.visible = !out;
    // Knocked out, he is a heap on the cell floor.
    body.scale.y = out ? 0.25 : 1;
    lamp.material.emissive.setHex(state.cellOpen ? 0x20aa40 : 0xaa2020);
    if (out) return;
    const [from, to] = snitchWindow(state);
    const positions = geometry.attributes.position;
    positions.setXYZ(0, state.x, 1.45, CELL_Z + 0.1);
    positions.setXYZ(1, from, 0.02, 0.5);
    positions.setXYZ(2, to, 0.02, 0.5);
    positions.needsUpdate = true;
    material.color.setHex(state.sees ? SEEN : WATCHING);
    material.opacity = state.sees ? 0.4 : 0.2;
  }
  return { group, update };
}

export function createTraderView(trader) {
  return inmate(trader.x, 0x3aa05a);
}
