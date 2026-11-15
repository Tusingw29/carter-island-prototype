// Debug-only drawings: the noise ring, exact vision cone outlines, and patrol paths.
import {
  BufferGeometry, Group, Line, LineBasicMaterial, LineLoop, Vector3,
} from '../../vendor/three.module.js';
import { FAN_POINTS, sightBlockers } from '../game/sight.js';
import { coneLit, coneShape } from '../game/vision.js';

const Z = 0.6;

function circle(color) {
  const points = [];
  for (let i = 0; i < 48; i += 1) {
    const angle = (i / 48) * Math.PI * 2;
    points.push(new Vector3(Math.cos(angle), Math.sin(angle), 0));
  }
  return new LineLoop(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color }));
}

function outline(color, count) {
  const points = Array.from({ length: count }, () => new Vector3());
  const line = new LineLoop(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color }));
  line.frustumCulled = false;
  return line;
}

function patrolPath(guard, index) {
  const feetY = guard.y ?? 0;
  const y = feetY + 0.05 + index * 0.06;
  const points = [
    new Vector3(guard.patrolMin, feetY + 0.4, Z), new Vector3(guard.patrolMin, y, Z),
    new Vector3(guard.patrolMax, y, Z), new Vector3(guard.patrolMax, feetY + 0.4, Z),
  ];
  return new Line(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color: 0x4fd0ff }));
}

export function createDebugView(world) {
  const group = new Group();
  const ring = circle(0x7dff9a);
  group.add(ring);
  const cones = world.guards.map((guard, index) => {
    const cone = outline(0xffffff, FAN_POINTS + 1);
    group.add(cone, patrolPath(guard, index));
    return cone;
  });

  function update(currentWorld, enabled) {
    group.visible = enabled;
    if (!enabled) return;
    const radius = currentWorld.noiseRadius;
    ring.visible = radius > 0;
    ring.position.set(currentWorld.player.x, (currentWorld.player.y ?? 0) + 0.2, Z);
    ring.scale.setScalar(radius || 1);
    currentWorld.guards.forEach((guard, i) => {
      cones[i].visible = guard.state !== 'out' && guard.state !== 'asleep';
      const positions = cones[i].geometry.attributes.position;
      // The exact edge of what he can see, shadows and all. Spare points sit on the last one.
      const lit = coneLit(coneShape(guard), sightBlockers(currentWorld.room));
      for (let n = 0; n <= FAN_POINTS; n += 1) {
        const corner = lit[Math.min(n, lit.length - 1)];
        positions.setXYZ(n, corner.x, corner.y, Z);
      }
      positions.needsUpdate = true;
    });
  }
  return { group, update };
}
