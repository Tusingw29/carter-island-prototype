// Draws a security camera and the stretch of floor it is watching.
import { Group } from '../../vendor/three.module.js';
import { cameraLit, cameraMount } from '../game/camera.js';
import { block, placed } from './blocks.js';
import { fanMesh, setFan } from './guard-view.js';

const WATCHING = 0x6ab0ff;
const SEEN = 0xff4a3c;

export function createCameraView(camera) {
  const group = new Group();
  const mount = cameraMount(camera);
  const lens = placed(block(0.2, 0.2, 0.2, 0x111111, WATCHING), mount.x, mount.y + 0.05, -1.3);
  group.add(placed(block(0.5, 0.3, 0.5, 0x2a2e36), mount.x, mount.y + 0.2, -1.5), lens);
  const beam = fanMesh(WATCHING, 0.14);
  group.add(beam);

  // blockers are the boxes that cut the beam short (see sight.js).
  function update(state, far = 0, blockers = []) {
    beam.visible = !state.off;
    lens.material.emissive.setHex(state.off ? 0x000000 : (state.sees ? SEEN : WATCHING));
    setFan(beam, cameraLit(state, blockers), 0.3);
    beam.material.color.setHex(state.sees ? SEEN : WATCHING);
    beam.material.opacity = (state.sees ? 0.3 : 0.14) * (1 + 0.6 * far);
  }
  return { group, update };
}
