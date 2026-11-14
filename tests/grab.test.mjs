// Getting grabbed, the one break-free chance, and the run ending on the second grab.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { eventTypes, run, runUntil, tap, testWorld } from './helpers.mjs';

const sentry = (id, x, facing = 1) => ({ id, patrol: [x, x], startX: x, facing });

// Stand in front of a guard until he grabs you.
function grabbedWorld() {
  const world = testWorld({ playerX: 23, guards: [sentry('g', 20)] });
  runUntil(world, () => world.grab !== null, {}, 5);
  return world;
}

function mash(world, presses) {
  for (let i = 0; i < presses; i += 1) tap(world, 'action');
}

test('an Alert guard who reaches the player grabs them', () => {
  const world = grabbedWorld();
  assert.equal(world.grab.guardId, 'g');
  assert.equal(world.over, null);
  assert.ok(eventTypes(world).includes('grab'));
  assert.equal(currentPrompt(world), null);
});

test('a calm or suspicious guard never grabs, even standing on top of the player', () => {
  const world = testWorld({ playerX: 19.5, guards: [sentry('g', 20)] });
  run(world, {}, 5);
  assert.equal(world.grab, null);
});

test('while grabbed the player cannot move', () => {
  const world = grabbedWorld();
  const heldAt = world.player.x;
  run(world, { moveX: 1, run: true }, 1);
  assert.equal(world.player.x, heldAt);
  assert.equal(world.player.mode, 'grabbed');
});

test('mashing enough times breaks free: shoved clear, guard dazed, chance used up', () => {
  const world = grabbedWorld();
  const heldAt = world.player.x;
  mash(world, CONFIG.grab.mashNeeded - 1);
  assert.notEqual(world.grab, null, 'one press short is not enough');
  mash(world, 1);
  assert.equal(world.grab, null);
  assert.equal(world.over, null);
  assert.equal(world.breakFreeUsed, true);
  assert.ok(Math.abs(world.player.x - heldAt) >= CONFIG.grab.shoveDistance - 0.01);
  assert.ok(world.guards[0].stun > 0);
  assert.ok(eventTypes(world).includes('free'));
});

test('holding the button down does not count as mashing', () => {
  const world = grabbedWorld();
  run(world, { action: true }, CONFIG.grab.mashSeconds + 0.5);
  assert.equal(world.over, 'caught');
});

test('not mashing in time ends the run', () => {
  const world = grabbedWorld();
  run(world, {}, CONFIG.grab.mashSeconds + 0.1);
  assert.equal(world.over, 'caught');
  assert.ok(eventTypes(world).includes('caught'));
});

test('after breaking free there is a moment of safety to get away', () => {
  const world = grabbedWorld();
  mash(world, CONFIG.grab.mashNeeded);
  run(world, {}, CONFIG.grab.immunitySeconds - 0.2);
  assert.equal(world.grab, null);
  assert.equal(world.over, null);
});

test('the second grab ends the run with no second chance', () => {
  const world = grabbedWorld();
  mash(world, CONFIG.grab.mashNeeded);
  runUntil(world, () => world.over !== null, {}, 15);
  assert.equal(world.over, 'caught');
  assert.equal(world.grab, null, 'no mash prompt the second time');
});

test('once caught, the world stops', () => {
  const world = grabbedWorld();
  run(world, {}, CONFIG.grab.mashSeconds + 0.1);
  const time = world.time;
  run(world, { moveX: 1 }, 1);
  assert.equal(world.time, time);
});

test('running away after breaking free is possible', () => {
  const world = testWorld({ width: 80, playerX: 23, guards: [sentry('g', 20)] });
  runUntil(world, () => world.grab !== null, {}, 5);
  mash(world, CONFIG.grab.mashNeeded);
  run(world, { moveX: 1, run: true }, 6);
  assert.equal(world.over, null);
  assert.equal(world.grab, null);
});
