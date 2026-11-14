// The guard's flashlight cone, in side view. x runs along the floor, y is height.
// The renderer draws exactly the shape computed here, so what you see is what the guard sees.
import { CONFIG } from './config.js';
import { playerHeight } from './player.js';

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function coneShape(guard, cfg = CONFIG.guard) {
  const tilt = toRadians(cfg.coneTiltDownDeg);
  return {
    origin: { x: guard.x, y: cfg.eyeHeight },
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
export function bodyPoints(x, height, count = 6) {
  return Array.from({ length: count }, (_, i) => ({ x, y: (height * (i + 0.5)) / count }));
}

export function guardSeesPlayer(guard, player, guardCfg = CONFIG.guard, playerCfg = CONFIG.player) {
  if (player.hiddenIn) return false;
  const shape = coneShape(guard, guardCfg);
  return bodyPoints(player.x, playerHeight(player, playerCfg)).some((point) => pointInCone(shape, point));
}
