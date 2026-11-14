// Draws a guard and his flashlight cone. The cone color shows his alert level.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, SpotLight,
} from '../../vendor/three.module.js';
import { shownState } from '../game/alert.js';
import { CONFIG } from '../game/config.js';
import { coneOutline, coneShape } from '../game/vision.js';
import { block, placed } from './blocks.js';

const CONE_Z = 0.35;
const FAR_BOOST = 0.6;
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

  // A white shell that shows for a moment when a knockout lands.
  const flash = new Mesh(new BoxGeometry(0.8, 1.95, 0.65), new MeshBasicMaterial({ color: 0xffffff }));
  flash.position.y = 0.95;
  flash.visible = false;
  body.add(flash);

  const cone = coneMesh();
  const light = new SpotLight(0xffe2a0, 60, 12, 0.36, 0.5, 1.2);
  parent.add(body, cone, light, light.target);

  // far is 0 with the camera close and 1 with it pulled right back.
  // now is the game clock, for the flash, the fall, and the struggle.
  function update(guard, far = 0, now = 0) {
    const out = guard.state === 'out';
    const asleep = guard.state === 'asleep';
    body.visible = !guard.hiddenIn;
    cone.visible = !out && !asleep && !guard.held;
    light.visible = !out && !asleep;
    torch.visible = !out && !asleep;
    // A knocked-out guard flashes white as the hit lands, then topples over and lies flat.
    const sinceHit = out && guard.outAt != null ? now - guard.outAt : Infinity;
    flash.visible = sinceHit < CONFIG.feel.flashSeconds;
    const fallen = out ? Math.min(1, sinceHit / CONFIG.feel.fallSeconds) ** 2 : 0;
    body.rotation.z = (fallen * Math.PI) / 2;
    body.position.set(guard.x + fallen * 0.9, fallen * 0.3, fallen * 0.5);
    // In a choke hold he thrashes from side to side.
    if (guard.held) body.rotation.z = Math.sin(now * 38) * 0.14;
    if (asleep) {
      body.rotation.z = guard.stirTimer > 0 ? -0.15 : -0.45;
      body.position.set(guard.x, -0.25, -0.6);
    }
    if (out || asleep) return;
    const state = shownState(guard);

    torch.position.x = guard.facing * 0.4;
    const positions = cone.geometry.attributes.position;
    coneOutline(coneShape(guard)).forEach((corner, i) => positions.setXYZ(i, corner.x, corner.y, CONE_Z));
    positions.needsUpdate = true;
    cone.material.color.setHex(STATE_COLORS[state]);
    // From far back the beam is drawn stronger, so it still reads at half the size.
    cone.material.opacity = (state === 'calm' ? 0.16 : 0.26) * (1 + FAR_BOOST * far);
    light.color.setHex(guard.state === 'alert' ? 0xff9a8a : 0xffe2a0);

    // The real light points a little toward the back wall so the beam shows up on it.
    light.position.set(guard.x + guard.facing * 0.4, 1.4, 0.4);
    light.target.position.set(guard.x + guard.facing * 5, 0.5, -1.4);
  }
  return { update };
}
