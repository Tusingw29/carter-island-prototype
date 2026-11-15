// Line of sight. Solid things in the walking lane (crates, walls, ledges) block it.
// Everything is in side view: x runs along the floor, y is height.
//
// A blocker is a box: { x, halfWidth, bottom, top }. A room's blockers are its solids, except
// ones marked seeThrough (a chain-link fence).

const EPS = 1e-6;
const cache = new WeakMap();

export function sightBlockers(room) {
  if (!room) return [];
  if (!cache.has(room)) cache.set(room, (room.solids ?? []).filter((solid) => !solid.seeThrough));
  return cache.get(room);
}

const inside = (box, x, y) => (
  x > box.x - box.halfWidth + EPS && x < box.x + box.halfWidth - EPS && y > box.bottom + EPS && y < box.top - EPS
);

// How far a ray from origin goes along the direction (dx, dy) before it hits a box, up to max.
// dx, dy must be a unit vector. A box the origin is inside is ignored.
export function rayReach(origin, dx, dy, max, blockers) {
  let reach = max;
  for (const box of blockers) {
    if (inside(box, origin.x, origin.y)) continue;
    let near = 0;
    let far = reach;
    const slabs = [
      [origin.x, dx, box.x - box.halfWidth, box.x + box.halfWidth],
      [origin.y, dy, box.bottom, box.top],
    ];
    let hit = true;
    for (const [start, step, low, high] of slabs) {
      if (Math.abs(step) < EPS) {
        if (start <= low || start >= high) hit = false;
        continue;
      }
      const a = (low - start) / step;
      const b = (high - start) / step;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
    }
    if (hit && near < far - EPS && near < reach) reach = near;
  }
  return reach;
}

// Is the straight line between two points cut by a box?
export function sightBlocked(from, to, blockers) {
  if (blockers.length === 0) return false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < EPS) return false;
  return rayReach(from, dx / distance, dy / distance, distance, blockers) < distance - 1e-4;
}

// Is a point inside a lit shape? fan is what litFan returns: [origin, ...edge points]. The shape
// is the triangles between the origin and each pair of neighbouring edge points, which is
// exactly what the renderer draws. So "in the drawn light" and "in the light" are one question.
export function inFan(fan, point) {
  const [origin] = fan;
  const side = (a, b) => (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
  for (let i = 1; i < fan.length - 1; i += 1) {
    const a = side(origin, fan[i]);
    const b = side(fan[i], fan[i + 1]);
    const c = side(fan[i + 1], origin);
    const allLeft = a >= -1e-9 && b >= -1e-9 && c >= -1e-9;
    const allRight = a <= 1e-9 && b <= 1e-9 && c <= 1e-9;
    if (allLeft || allRight) return true;
  }
  return false;
}

// The flat surfaces a lit shape lands on, as { from, to, y }: the floor, and the tops of boxes.
// These are the pools of light to draw. Edge points that stop in mid-air or on the side of a
// box are not part of any pool.
export function fanPools(fan, blockers, floorY = 0) {
  const surface = (point) => {
    if (Math.abs(point.y - floorY) < 1e-4) return floorY;
    const box = blockers.find((entry) => (
      Math.abs(point.y - entry.top) < 1e-4 && point.x >= entry.x - entry.halfWidth - 1e-4
        && point.x <= entry.x + entry.halfWidth + 1e-4
    ));
    return box ? box.top : null;
  };
  const pools = [];
  let open = null;
  for (const point of fan.slice(1)) {
    const y = surface(point);
    if (open && y !== null && Math.abs(open.y - y) < 1e-4) {
      open.from = Math.min(open.from, point.x);
      open.to = Math.max(open.to, point.x);
      continue;
    }
    if (open && open.to - open.from > 0.02) pools.push(open);
    open = y === null ? null : { from: point.x, to: point.x, y };
  }
  if (open && open.to - open.from > 0.02) pools.push(open);
  return pools;
}

const wrap = (angle) => {
  let value = angle;
  while (value > Math.PI) value -= 2 * Math.PI;
  while (value < -Math.PI) value += 2 * Math.PI;
  return value;
};

const BASE_RAYS = 24;
// The most points a fan ever has after its origin. The renderer makes room for this many.
export const FAN_POINTS = 72;

// The lit shape of a beam: a fan of rays from origin, between two angles, each stopped by the
// floor, by the first box it meets, or by the range. Returns [origin, ...points along the edge].
// Extra rays are aimed just either side of every box corner, so shadows have sharp edges.
export function litFan(origin, fromAngle, toAngle, range, blockers, floorY = 0) {
  const middle = (fromAngle + toAngle) / 2;
  const half = (toAngle - fromAngle) / 2;
  const offsets = [];
  for (let i = 0; i <= BASE_RAYS; i += 1) offsets.push(-half + (2 * half * i) / BASE_RAYS);
  for (const box of blockers) {
    for (const cx of [box.x - box.halfWidth, box.x + box.halfWidth]) {
      for (const cy of [box.bottom, box.top]) {
        if (offsets.length + 2 > FAN_POINTS) break;
        if (Math.hypot(cx - origin.x, cy - origin.y) > range + 1) continue;
        const offset = wrap(Math.atan2(cy - origin.y, cx - origin.x) - middle);
        if (Math.abs(offset) >= half) continue;
        offsets.push(Math.max(-half, offset - 0.002), Math.min(half, offset + 0.002));
      }
    }
  }
  offsets.sort((a, b) => a - b);
  const points = [origin];
  for (const offset of offsets) {
    const dx = Math.cos(middle + offset);
    const dy = Math.sin(middle + offset);
    let reach = range;
    if (dy < -EPS && origin.y > floorY) reach = Math.min(reach, (floorY - origin.y) / dy);
    reach = rayReach(origin, dx, dy, reach, blockers);
    points.push({ x: origin.x + dx * reach, y: origin.y + dy * reach });
  }
  return points;
}
