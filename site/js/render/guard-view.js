// Draws a guard, his flashlight cone, and the "!" when he sees the player.
import {
  BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, SpotLight,
} from '../../vendor/three.module.js';
import { coneOutline, coneShape } from '../game/vision.js';
import { block, placed } from './blocks.js';

const CONE_Z = 0.35;
const CALM_COLOR = 0xf2d98a;
const SEEN_COLOR = 0xff5a3c;

function coneMesh() {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const material = new MeshBasicMaterial({
    color: CALM_COLOR, transparent: true, opacity: 0.16, side: DoubleSide, depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

function exclamation() {
  const mark = new Group();
  mark.add(placed(block(0.16, 0.5, 0.16, SEEN_COLOR, SEEN_COLOR), 0, 0.45, 0));
  mark.add(placed(block(0.16, 0.16, 0.16, SEEN_COLOR, SEEN_COLOR), 0, 0, 0));
  return mark;
}

export function createGuardView(scene) {
  const body = new Group();
  body.add(placed(block(0.7, 1.35, 0.55, 0x2c3e66, 0x0a1020), 0, 0.675, 0));
  body.add(placed(block(0.38, 0.38, 0.38, 0xd0b090, 0x2a2118), 0, 1.54, 0));
  body.add(placed(block(0.46, 0.12, 0.46, 0x16203a), 0, 1.78, 0));
  const torch = placed(block(0.3, 0.1, 0.1, 0xeeeeee, 0xf2d98a), 0.4, 1.3, 0.3);
  const mark = placed(exclamation(), 0, 2.2, 0);
  body.add(torch, mark);

  const cone = coneMesh();
  const light = new SpotLight(0xffe2a0, 60, 12, 0.36, 0.5, 1.2);
  scene.add(body, cone, light, light.target);

  function update(guard) {
    body.position.set(guard.x, 0, 0);
    torch.position.x = guard.facing * 0.4;
    mark.visible = guard.seesPlayer;

    const corners = coneOutline(coneShape(guard));
    const positions = cone.geometry.attributes.position;
    corners.forEach((corner, i) => positions.setXYZ(i, corner.x, corner.y, CONE_Z));
    positions.needsUpdate = true;
    cone.material.color.setHex(guard.seesPlayer ? SEEN_COLOR : CALM_COLOR);
    cone.material.opacity = guard.seesPlayer ? 0.3 : 0.16;

    // The real light points a little toward the back wall so the beam shows up on it.
    light.position.set(guard.x + guard.facing * 0.4, 1.4, 0.4);
    light.target.position.set(guard.x + guard.facing * 5, 0.5, -1.4);
  }
  return { update };
}
