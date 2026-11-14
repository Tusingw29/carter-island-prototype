import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { emptyIntent, intentFromGamepad, intentFromKeys, mergeIntents } from '../site/js/game/intent.js';
import { createGuard, updateGuard } from '../site/js/game/guard.js';
import { createPlayer } from '../site/js/game/player.js';
import { nearestHideSpot, toggleHide } from '../site/js/game/hiding.js';
import { createWorld, stepWorld } from '../site/js/game/world.js';

const STEP = 1 / 120;
const intent = (changes) => ({ ...emptyIntent(), ...changes });
const lockers = [{ id: 'locker-1', type: 'locker', x: 11 }];

function run(world, changes, seconds) {
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) stepWorld(world, intent(changes), STEP);
}

test('hiding: you can only get in a locker when you are next to it', () => {
  const far = createPlayer(5);
  assert.equal(nearestHideSpot(far, lockers), null);
  assert.equal(toggleHide(far, lockers), null);
  assert.equal(far.hiddenIn, null);

  const near = createPlayer(11 + CONFIG.hide.reach - 0.1);
  assert.equal(toggleHide(near, lockers), 'hid');
  assert.equal(near.hiddenIn, 'locker-1');
  assert.equal(near.x, 11);
  assert.equal(toggleHide(near, lockers), 'left');
  assert.equal(near.hiddenIn, null);
});

test('world: Up hides once per press, and a hidden player cannot move', () => {
  const world = createWorld();
  world.player.x = world.room.hideSpots[0].x;
  run(world, { up: true }, 0.5);
  assert.equal(world.player.hiddenIn, 'locker-1', 'holding Up does not toggle back out');
  run(world, { moveX: 1, run: true }, 0.5);
  assert.equal(world.player.x, world.room.hideSpots[0].x);
  assert.equal(world.player.mode, 'hidden');
  assert.equal(world.noiseRadius, 0);
  run(world, { up: true }, 0.1);
  assert.equal(world.player.hiddenIn, null);
});

test('world: the guard sees a player in the open but not one in the locker', () => {
  const world = createWorld();
  const guard = world.guards[0];
  const lockerX = world.room.hideSpots[0].x;
  guard.x = lockerX - 4;
  guard.facing = 1;
  world.player.x = lockerX;

  stepWorld(world, intent({}), STEP);
  assert.equal(guard.seesPlayer, true);
  assert.equal(world.stats.timesSpotted, 1);

  stepWorld(world, intent({ up: true }), STEP);
  assert.equal(guard.seesPlayer, false);

  // The guard walks his whole beat past the locker and never notices.
  run(world, {}, 30);
  assert.equal(world.stats.timesSpotted, 1);
});

test('world: being seen for a long time counts as one spotting, not many', () => {
  const world = createWorld();
  world.guards[0].x = 10;
  world.guards[0].facing = 1;
  world.player.x = 13;
  run(world, {}, 1);
  assert.equal(world.stats.timesSpotted, 1);
});

test('world: noise ring follows what the player is doing', () => {
  const world = createWorld();
  run(world, { moveX: 1 }, 0.1);
  assert.equal(world.noiseRadius, CONFIG.noise.walkRadius);
  run(world, { moveX: 1, run: true }, 0.1);
  assert.equal(world.noiseRadius, CONFIG.noise.runRadius);
  run(world, { moveX: 1, crouch: true }, 0.1);
  assert.equal(world.noiseRadius, 0);
});

test('guard: walks to the end of his patrol, pauses, turns, and walks back', () => {
  const guard = createGuard({ id: 'g', patrol: [5, 8], startX: 5, facing: 1 });
  const walkTime = 3 / CONFIG.guard.walkSpeed;
  for (let t = 0; t < walkTime + 0.1; t += STEP) updateGuard(guard, STEP);
  assert.equal(guard.x, 8);
  assert.equal(guard.facing, 1, 'still looking ahead during the pause');
  for (let t = 0; t < CONFIG.guard.turnPauseSeconds; t += STEP) updateGuard(guard, STEP);
  assert.equal(guard.facing, -1);
  for (let t = 0; t < walkTime + 0.1; t += STEP) updateGuard(guard, STEP);
  assert.equal(guard.x, 5);
});

test('guard: the patrol is identical every run', () => {
  const trace = () => {
    const world = createWorld();
    const samples = [];
    for (let i = 0; i < 120 * 60; i += 1) {
      stepWorld(world, intent({}), STEP);
      if (i % 120 === 0) samples.push([world.guards[0].x, world.guards[0].facing]);
    }
    return samples;
  };
  assert.deepEqual(trace(), trace());
});

test('keyboard: the spec keys map to the right actions', () => {
  assert.deepEqual(intentFromKeys(new Set(['KeyD', 'ShiftLeft'])), intent({ moveX: 1, run: true }));
  assert.deepEqual(intentFromKeys(new Set(['KeyA', 'KeyS'])), intent({ moveX: -1, crouch: true }));
  assert.deepEqual(intentFromKeys(new Set(['KeyW'])), intent({ up: true }));
  assert.deepEqual(intentFromKeys(new Set(['F1'])), intent({ debug: true }));
  assert.equal(intentFromKeys(new Set(['KeyA', 'KeyD'])).moveX, 0);
});

test('controller: standard mapping, with a deadzone on the stick', () => {
  const pad = (axes, down = {}) => ({
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: Boolean(down[i]), value: down[i] ? 1 : 0 })),
  });
  assert.equal(intentFromGamepad(pad([0.2, 0])).moveX, 0);
  assert.equal(intentFromGamepad(pad([0.6, 0])).moveX, 1);
  assert.equal(intentFromGamepad(pad([-0.9, 0])).moveX, -1);
  assert.equal(intentFromGamepad(pad([0, 0], { 14: true })).moveX, -1);
  assert.equal(intentFromGamepad(pad([0, -0.9])).up, true);
  assert.equal(intentFromGamepad(pad([0, 0], { 12: true })).up, true);
  assert.equal(intentFromGamepad(pad([0, 0.9])).crouch, true);
  assert.equal(intentFromGamepad(pad([0, 0], { 13: true })).crouch, true);
  assert.equal(intentFromGamepad(pad([0, 0], { 7: true })).run, true);
  assert.deepEqual(intentFromGamepad(null), emptyIntent());
});

test('keyboard and controller can be used together', () => {
  const merged = mergeIntents(intent({ moveX: 1 }), intent({ run: true, moveX: 1 }));
  assert.deepEqual(merged, intent({ moveX: 1, run: true }));
});
