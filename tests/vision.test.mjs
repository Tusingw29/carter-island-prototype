import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { createGuard } from '../site/js/game/guard.js';
import { createPlayer } from '../site/js/game/player.js';
import { coneCorners, coneOutline, coneShape, guardSeesPlayer, pointInCone } from '../site/js/game/vision.js';

const guardAt = (x, facing) => createGuard({ id: 'g', patrol: [0, 30], startX: x, facing });
const flat = { origin: { x: 0, y: 0 }, angle: 0, halfAngle: Math.PI / 6, range: 10 };

test('pointInCone: inside, outside the angle, and beyond the range', () => {
  assert.ok(pointInCone(flat, { x: 5, y: 0 }));
  assert.ok(pointInCone(flat, { x: 5, y: 2 }));
  assert.ok(!pointInCone(flat, { x: 5, y: 4 }));
  assert.ok(!pointInCone(flat, { x: -5, y: 0 }));
  assert.ok(!pointInCone(flat, { x: 11, y: 0 }));
  assert.ok(pointInCone(flat, { x: 0, y: 0 }));
});

test('pointInCone works for a cone pointing left', () => {
  const left = { ...flat, angle: Math.PI };
  assert.ok(pointInCone(left, { x: -5, y: 1 }));
  assert.ok(pointInCone(left, { x: -5, y: -1 }));
  assert.ok(!pointInCone(left, { x: 5, y: 0 }));
});

test('the cone flips with the guard and its corners sit at full range', () => {
  const right = coneCorners(coneShape(guardAt(10, 1)));
  const left = coneCorners(coneShape(guardAt(10, -1)));
  for (const corner of right.slice(1)) assert.ok(corner.x > 10);
  for (const corner of left.slice(1)) assert.ok(corner.x < 10);
  for (const corner of [...right.slice(1), ...left.slice(1)]) {
    const distance = Math.hypot(corner.x - 10, corner.y - CONFIG.guard.eyeHeight);
    assert.ok(Math.abs(distance - CONFIG.guard.coneRange) < 1e-9);
  }
});

test('a guard sees a player standing in front of him', () => {
  assert.ok(guardSeesPlayer(guardAt(10, 1), createPlayer(14)));
  assert.ok(guardSeesPlayer(guardAt(10, -1), createPlayer(6)));
});

test('a guard does not see a player behind him', () => {
  assert.ok(!guardSeesPlayer(guardAt(10, 1), createPlayer(8)));
  assert.ok(!guardSeesPlayer(guardAt(10, -1), createPlayer(12)));
});

test('a guard does not see a player beyond the flashlight range', () => {
  const far = 10 + CONFIG.guard.coneRange + 1;
  assert.ok(!guardSeesPlayer(guardAt(10, 1), createPlayer(far)));
});

test('a hidden player is never seen, even in the middle of the cone', () => {
  const player = createPlayer(14);
  player.hiddenIn = 'locker-1';
  assert.ok(!guardSeesPlayer(guardAt(10, 1), player));
});

test('crouching does not hide you out in the open', () => {
  const player = createPlayer(14);
  player.crouching = true;
  assert.ok(guardSeesPlayer(guardAt(10, 1), player));
});

test('the drawn cone never dips below the floor', () => {
  for (const facing of [1, -1]) {
    const outline = coneOutline(coneShape(guardAt(10, facing)));
    assert.equal(outline.length, 4);
    for (const corner of outline) assert.ok(corner.y >= -1e-9);
    assert.ok(outline.some((corner) => Math.abs(corner.y) < 1e-9), 'the beam reaches the floor');
  }
});
