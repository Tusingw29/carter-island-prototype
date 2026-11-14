// Draws a guard and his flashlight cone. The cone color shows his alert level.
import {
  BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, SpotLight,
} from '../../vendor/three.module.js';
import { coneOutline, coneShape } from '../game/vision.js';
import { block, placed } from './blocks.js';

const CONE_Z = 0.35;
export const STATE_COLORS = { calm: 0xf2d98a, suspicious: 0xffb03a, searching: 0xff8a3a, alert: 0xff4a3c };

function coneMesh() {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const material = new MeshBasicMaterial({
    color: STATE_COLORS.calm, transparent: true, opacity: 0.16, side: DoubleSide, depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

export function createGuardView(parent) {
  const body = new Group();
  body.add(placed(block(0.7, 1.35, 0.55, 0x2c3e66, 0x0a1020), 0, 0.675, 0));
  body.add(placed(block(0.38, 0.38, 0.38, 0xd0b090, 0x2a2118), 0, 1.54, 0));
  body.add(placed(block(0.46, 0.12, 0.46, 0x16203a), 0, 1.78, 0));
  const torch = placed(block(0.3, 0.1, 0.1, 0xeeeeee, 0xf2d98a), 0.4, 1.3, 0.3);
  body.add(torch);

  const cone = coneMesh();
  const light = new SpotLight(0xffe2a0, 60, 12, 0.36, 0.5, 1.2);
  parent.add(body, cone, light, light.target);

  function update(guard) {
    const out = guard.state === 'out';
    body.visible = !guard.hiddenIn;
    cone.visible = !out;
    light.visible = !out;
    torch.visible = !out;
    // A knocked-out guard lies flat on the floor.
    body.rotation.z = out ? Math.PI / 2 : 0;
    body.position.set(guard.x + (out ? 0.9 : 0), out ? 0.3 : 0, out ? 0.5 : 0);
    if (out) return;

    torch.position.x = guard.facing * 0.4;
    const positions = cone.geometry.attributes.position;
    coneOutline(coneShape(guard)).forEach((corner, i) => positions.setXYZ(i, corner.x, corner.y, CONE_Z));
    positions.needsUpdate = true;
    cone.material.color.setHex(STATE_COLORS[guard.state]);
    cone.material.opacity = guard.state === 'calm' ? 0.16 : 0.26;
    light.color.setHex(guard.state === 'alert' ? 0xff9a8a : 0xffe2a0);

    // The real light points a little toward the back wall so the beam shows up on it.
    light.position.set(guard.x + guard.facing * 0.4, 1.4, 0.4);
    light.target.position.set(guard.x + guard.facing * 5, 0.5, -1.4);
  }
  return { update };
}
