// The guard's flashlight cone, in side view. x runs along the floor, y is height.
// The renderer draws exactly the shape computed here, so what you see is what the guard sees.
import { CONFIG } from './config.js';
import { playerHeight } from './player.js';
import { litFan, sightBlocked } from './sight.js';

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function coneShape(guard, cfg = CONFIG.guard) {
  const tilt = toRadians(cfg.coneTiltDownDeg);
  return {
    origin: { x: guard.x, y: (guard.y ?? 0) + cfg.eyeHeight },
    // Pointing right and slightly down, or mirrored when facing left.
    angle: guard.facing > 0 ? -tilt : Math.PI + tilt,
    halfAngle: toRadians(cfg.coneHalfAngleDeg),
    range: cfg.coneRange,
  };
}

// The three corners of the cone triangle: the origin and the two far ends.
export function coneCorners(shape) {
  const corner = (angle) => ({
    x: shape.origin.x + Math.cos(angle) * shape.range,
    y: shape.origin.y + Math.sin(angle) * shape.range,
  });
  return [shape.origin, corner(shape.angle - shape.halfAngle), corner(shape.angle + shape.halfAngle)];
}

// The cone as drawn: the triangle with the part below the floor cut off.
// Always returns four points so the renderer can use a fixed-size shape.
export function coneOutline(shape, floorY = 0) {
  const corners = coneCorners(shape);
  const kept = [];
  corners.forEach((from, i) => {
    const to = corners[(i + 1) % corners.length];
    if (from.y >= floorY) kept.push(from);
    if ((from.y >= floorY) !== (to.y >= floorY)) {
      const t = (floorY - from.y) / (to.y - from.y);
      kept.push({ x: from.x + (to.x - from.x) * t, y: floorY });
    }
  });
  while (kept.length < 4) kept.push(kept[kept.length - 1]);
  return kept.slice(0, 4);
}

export function pointInCone(shape, point) {
  const dx = point.x - shape.origin.x;
  const dy = point.y - shape.origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance > shape.range) return false;
  if (distance === 0) return true;
  let difference = Math.atan2(dy, dx) - shape.angle;
  while (difference > Math.PI) difference -= 2 * Math.PI;
  while (difference < -Math.PI) difference += 2 * Math.PI;
  return Math.abs(difference) <= shape.halfAngle;
}

// Points up the middle of a body, feet to head.
export function bodyPoints(x, height, count = 6, feetY = 0) {
  return Array.from({ length: count }, (_, i) => ({ x, y: feetY + (height * (i + 0.5)) / count }));
}

// The cone as drawn when things stand in it: the same triangle, cut off by the floor and by
// every blocker, so the shadow behind a crate shows. Returns [origin, ...edge points].
export function coneLit(shape, blockers = [], floorY = 0) {
  return litFan(shape.origin, shape.angle - shape.halfAngle, shape.angle + shape.halfAngle, shape.range,
    blockers, floorY);
}

// blockers are the boxes that block sight in the guard's room (see sight.js). He sees you if any
// point up your body, feet to head, is in his beam with nothing solid in the way. So low cover
// only hides you if you crouch behind it, and tall cover hides you standing.
export function guardSeesPlayer(
  guard, player, guardCfg = CONFIG.guard, playerCfg = CONFIG.player, blockers = [],
) {
  if (player.hiddenIn || player.inDark) return false;
  const shape = coneShape(guard, guardCfg);
  const feetY = player.y ?? 0;
  const points = bodyPoints(player.x, playerHeight(player, playerCfg), 6, feetY);
  const clear = (point) => !sightBlocked(shape.origin, point, blockers);
  // Right in front of him, on his level, you are noticed even if you duck under the beam.
  const ahead = (player.x - guard.x) * guard.facing;
  const level = Math.abs(feetY - (guard.y ?? 0)) <= guardCfg.closeSightUp;
  if (level && ahead >= 0 && ahead <= guardCfg.closeSightDistance && points.some(clear)) return true;
  return points.some((point) => pointInCone(shape, point) && clear(point));
}
