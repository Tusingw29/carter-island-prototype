// Draws a security camera and the stretch of floor it is watching.
import {
  BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial,
} from '../../vendor/three.module.js';
import { block, placed } from './blocks.js';

const MOUNT_Y = 3.7;
const WATCHING = 0x6ab0ff;
const SEEN = 0xff4a3c;

export function createCameraView(camera) {
  const group = new Group();
  const mountX = (camera.min + camera.max) / 2;
  const lens = placed(block(0.2, 0.2, 0.2, 0x111111, WATCHING), mountX, MOUNT_Y - 0.15, -1.3);
  group.add(placed(block(0.5, 0.3, 0.5, 0x2a2e36), mountX, MOUNT_Y, -1.5), lens);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
  const material = new MeshBasicMaterial({
    color: WATCHING, transparent: true, opacity: 0.14, side: DoubleSide, depthWrite: false,
  });
  const beam = new Mesh(geometry, material);
  beam.frustumCulled = false;
  group.add(beam);

  function update(state) {
    beam.visible = !state.off;
    lens.material.emissive.setHex(state.off ? 0x000000 : (state.sees ? SEEN : WATCHING));
    const positions = geometry.attributes.position;
    positions.setXYZ(0, mountX, MOUNT_Y - 0.2, 0.3);
    positions.setXYZ(1, state.x - state.halfWidth, 0, 0.3);
    positions.setXYZ(2, state.x + state.halfWidth, 0, 0.3);
    positions.needsUpdate = true;
    material.color.setHex(state.sees ? SEEN : WATCHING);
    material.opacity = state.sees ? 0.3 : 0.14;
  }
  return { group, update };
}
