// Knockouts, dragging and hiding bodies, and guards finding bodies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { knock, eventTypes, run, runUntil, tap, testWorld } from './helpers.mjs';

const sentry = (id, x, facing = 1) => ({ id, patrol: [x, x], startX: x, facing });
const locker = { id: 'locker', type: 'locker', x: 14 };

// Player right behind a guard who faces right.
function behindGuard(extra = {}) {
  return testWorld({ playerX: 19.2, guards: [sentry('g', 20)], ...extra });
}

test('knockout from behind works', () => {
  const world = behindGuard();
  assert.equal(currentPrompt(world).text, 'SPACE: knock out');
  knock(world);
  assert.equal(world.guards[0].state, 'out');
  assert.equal(world.stats.knockouts, 1);
  assert.ok(eventTypes(world).includes('knockout'));
});

test('knockout from the front does nothing', () => {
  const world = testWorld({ playerX: 20.8, guards: [sentry('g', 20)] });
  tap(world, 'action');
  assert.notEqual(world.guards[0].state, 'out');
  assert.equal(world.stats.knockouts, 0);
});

test('knockout needs you to be close', () => {
  const world = testWorld({ playerX: 20 - CONFIG.knockout.reach - 0.3, guards: [sentry('g', 20)] });
  tap(world, 'action');
  assert.equal(world.guards[0].state, 'calm');
});

test('a knocked-out guard sees and hears nothing while he is down', () => {
  const world = behindGuard();
  knock(world);
  run(world, { moveX: 1, run: true }, 2);
  run(world, {}, 30);
  assert.equal(world.guards[0].state, 'out');
  assert.equal(world.guards[0].seesPlayer, false);
});

test('holding the button knocks out once and does not also start dragging', () => {
  const world = behindGuard();
  run(world, { action: true }, 1);
  assert.equal(world.guards[0].state, 'out');
  assert.equal(world.player.dragging, null);
});

test('drag: the body follows the player, slowly, and you cannot run or hide while dragging', () => {
  const world = behindGuard({ hideSpots: [locker] });
  knock(world);
  tap(world, 'action');
  assert.equal(world.player.dragging, 'g');
  const start = world.player.x;
  run(world, { moveX: -1, run: true }, 1);
  assert.ok(Math.abs(start - world.player.x - CONFIG.player.dragSpeed) < 0.05);
  assert.equal(world.player.mode, 'drag');
  assert.ok(Math.abs(world.guards[0].x - world.player.x) < 1, 'the body is right behind you');
  assert.equal(world.noiseRadius, CONFIG.noise.dragRadius);
});

test('drag: pressing the button again drops the body where you stand', () => {
  const world = behindGuard();
  knock(world);
  tap(world, 'action');
  run(world, { moveX: -1 }, 2);
  tap(world, 'action');
  assert.equal(world.player.dragging, null);
  const droppedAt = world.guards[0].x;
  run(world, { moveX: -1 }, 1);
  assert.equal(world.guards[0].x, droppedAt);
});

test('stuff the body in a locker: it is hidden and the locker is full', () => {
  const world = behindGuard({ hideSpots: [locker] });
  knock(world);
  tap(world, 'action');
  runUntil(world, () => Math.abs(world.player.x - locker.x) < 0.3, { moveX: -1 }, 10);
  assert.equal(currentPrompt(world).text, 'UP: stuff body in');
  tap(world, 'up');
  assert.equal(world.guards[0].hiddenIn, 'locker');
  assert.equal(world.player.dragging, null);
  assert.equal(world.player.hiddenIn, null, 'Up stuffed the body, it did not hide the player');
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, null, 'a locker with a body in it has no room for you');
});

test('a guard who finds an unhidden body goes Alert', () => {
  const guards = [sentry('victim', 20), { id: 'finder', patrol: [26, 36], startX: 36, facing: -1 }];
  const world = testWorld({ playerX: 19.2, guards });
  knock(world);
  world.player.x = 2;
  world.events.length = 0;
  runUntil(world, () => world.guards[1].state === 'alert', {}, 30);
  assert.equal(world.stats.bodiesFound, 1);
  assert.equal(world.guards[0].bodyFound, true);
  assert.ok(eventTypes(world).includes('bodyFound'));
  assert.equal(world.stats.timesSpotted, 0, 'finding a body is not the same as spotting the player');
  // He runs to the body, then searches, and the same body does not set him off twice.
  runUntil(world, () => world.guards[1].state === 'calm', {}, 60);
  run(world, {}, 60);
  assert.equal(world.stats.bodiesFound, 1);
});

test('a body stuffed in a locker is not found while he is out', () => {
  const guards = [sentry('victim', 20), { id: 'finder', patrol: [10, 36], startX: 36, facing: -1 }];
  const world = testWorld({ playerX: 19.2, guards, hideSpots: [locker] });
  knock(world);
  tap(world, 'action');
  runUntil(world, () => Math.abs(world.player.x - locker.x) < 0.3, { moveX: -1 }, 10);
  tap(world, 'up');
  world.player.x = 1;
  run(world, {}, 60);
  assert.equal(world.stats.bodiesFound, 0);
  assert.equal(world.guards[1].state, 'calm');
});
