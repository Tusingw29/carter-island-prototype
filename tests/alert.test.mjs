// Every alert level change in the spec: Calm, Suspicious, Alert, Searching, back to Calm.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { alertSummary } from '../site/js/game/alert.js';
import { detectionRate } from '../site/js/game/senses.js';
import { eventTypes, run, runUntil, tap, testWorld } from './helpers.mjs';

const G = CONFIG.guard;
// A guard who stands still at x looking right (his patrol is a single point).
const sentry = (id, x, facing = 1) => ({ id, patrol: [x, x], startX: x, facing });
const state = (world, index = 0) => world.guards[index].state;
// Stands in for breaking line of sight: he is dazed for a moment and has lost track of you.
const loseHim = (guard) => Object.assign(guard, { stun: 3, trackTimer: 0, seesPlayer: false });

test('Calm to Suspicious: a guard hears running and walks to the noise', () => {
  // Since Step 12 noise fills a hearing meter: about a second of running in earshot. Here the
  // player runs on the spot against the end wall, 6 m behind him.
  const world = testWorld({ playerX: 0.5, guards: [sentry('g', 6.5)] });
  runUntil(world, () => state(world) === 'suspicious', { moveX: -1, run: true }, 1.2);
  assert.ok(eventTypes(world).includes('suspicious'));
  const heardAt = world.guards[0].targetX;
  world.player.hiddenIn = 'elsewhere';
  run(world, {}, 1);
  assert.equal(world.guards[0].facing, -1, 'he turned toward the noise');
  assert.ok(world.guards[0].x < 6.5, 'he is walking toward it');
  assert.ok(Math.abs(heardAt - 0.5) < 0.1);
});

test('walking is only heard close up, and crouching is never heard', () => {
  const far = testWorld({ playerX: 14, guards: [sentry('g', 20)] });
  run(far, { moveX: -1 }, 1);
  assert.equal(state(far), 'calm', 'walking 6 m behind him is too quiet');

  // Step 12: walking carries 1 m, not 2.5 m.
  const near = testWorld({ playerX: 18, guards: [sentry('g', 20)] });
  run(near, { moveX: -1 }, 0.3);
  assert.equal(state(near), 'calm', 'walking 2 m behind him is not heard any more');
  assert.equal(near.guards[0].hearing, 0);

  const sneaky = testWorld({ playerX: 16, guards: [sentry('g', 20)] });
  run(sneaky, { moveX: 1, crouch: true }, 1.6);
  assert.equal(state(sneaky), 'calm', 'crouch-walking right up behind him is silent');
});

test('Calm to Suspicious: a glimpse at the edge of the flashlight', () => {
  const world = testWorld({ playerX: 26.5, guards: [sentry('g', 20)] });
  runUntil(world, () => state(world) === 'suspicious', {}, 2);
  assert.ok(world.guards[0].detection < 1);
  assert.equal(world.guards[0].targetX, 26.5);
  assert.equal(world.stats.timesSpotted, 0, 'a glimpse is not a spotting');
});

test('Suspicious to Calm: he checks the spot, finds nothing, and goes back to his patrol', () => {
  const world = testWorld({ playerX: 14, guards: [{ id: 'g', patrol: [20, 24], startX: 20, facing: 1 }] });
  world.pendingNoises.push({ x: 14, radius: 8 });
  world.player.hiddenIn = 'elsewhere';
  run(world, {}, 0.5);
  assert.equal(state(world), 'suspicious');
  world.player.x = 2;
  world.events.length = 0;
  runUntil(world, () => state(world) === 'calm', {}, 20);
  assert.ok(eventTypes(world).includes('calm'));
  assert.equal(world.guards[0].detection, 0);
  runUntil(world, () => world.guards[0].x >= 20, {}, 20);
});

test('Suspicious to Alert: he walks over and sees the player clearly', () => {
  const world = testWorld({ playerX: 26.5, guards: [sentry('g', 20)] });
  runUntil(world, () => state(world) === 'suspicious', {}, 2);
  runUntil(world, () => state(world) === 'alert', {}, 3);
  assert.equal(world.stats.timesSpotted, 1);
  assert.ok(eventTypes(world).includes('alert'));
});

test('Calm to Alert: close up, detection is quicker than far away, but never instant', () => {
  // Step 14: 0.8 s up close for a moving player. This one stands still, which halves the rate.
  const world = testWorld({ playerX: 22, guards: [sentry('g', 20)] });
  const time = runUntil(world, () => state(world) === 'alert', {}, 3);
  assert.ok(time > 0.5 && time <= G.detectNearSeconds / 0.5 + 0.05, `${time} s`);
  assert.ok(detectionRate({ state: 'calm' }, 1) > detectionRate({ state: 'calm' }, 6.5));
  assert.ok(detectionRate({ state: 'searching' }, 5) > detectionRate({ state: 'calm' }, 5));
});

test('stepping out of the light before the meter fills lets it drain back to nothing', () => {
  const world = testWorld({ playerX: 26.5, guards: [sentry('g', 20)] });
  run(world, {}, 0.2);
  assert.ok(world.guards[0].detection > 0);
  world.player.x = 10;
  run(world, {}, 3);
  assert.equal(world.guards[0].detection, 0);
  assert.equal(state(world), 'calm');
});

test('the alarm sends every guard to Alert, not just the one who saw you', () => {
  const world = testWorld({ playerX: 22, guards: [sentry('a', 20), sentry('b', 35)] });
  runUntil(world, () => state(world, 0) === 'alert', {}, 2);
  assert.equal(state(world, 1), 'alert');
  assert.equal(world.guards[1].lastKnownX, 22);
  assert.equal(world.stats.timesSpotted, 1, 'one spotting, however many guards respond');
});

test('Alert: the guard chases faster than the player walks but slower than the player runs', () => {
  assert.ok(G.alertSpeed > CONFIG.player.walkSpeed);
  assert.ok(G.alertSpeed < CONFIG.player.runSpeed);
  const world = testWorld({ width: 80, playerX: 22, guards: [sentry('g', 20)] });
  runUntil(world, () => state(world) === 'alert', {}, 2);
  const before = world.guards[0].x;
  run(world, { moveX: 1, run: true }, 2);
  assert.ok(world.guards[0].x > before + 3, 'he follows');
  assert.equal(world.grab, null, 'but cannot catch a running player');
});

test('Alert to Searching: he loses the player and starts to search', () => {
  const world = testWorld({ width: 80, playerX: 22, guards: [sentry('g', 20)] });
  runUntil(world, () => state(world) === 'alert', {}, 2);
  // Run far away, then go quiet.
  run(world, { moveX: 1, run: true }, 6);
  runUntil(world, () => state(world) === 'searching', { moveX: 1, crouch: true }, 20);
  assert.ok(eventTypes(world).includes('searching'));
  assert.equal(world.grab, null);
});

test('Searching to Calm: nothing found, so he calms down and patrols again', () => {
  const world = testWorld({ width: 80, playerX: 22, guards: [sentry('g', 20)] });
  runUntil(world, () => state(world) === 'alert', {}, 2);
  run(world, { moveX: 1, run: true }, 6);
  runUntil(world, () => state(world) === 'searching', { moveX: 1, crouch: true }, 20);
  runUntil(world, () => state(world) === 'calm', { moveX: 1, crouch: true }, G.searchSeconds + 5);
  runUntil(world, () => world.guards[0].x === 20, { moveX: 1, crouch: true }, 60);
});

test('Searching guards check hiding spots near where they lost the player', () => {
  const hideSpots = [{ id: 'near', type: 'locker', x: 27 }, { id: 'far', type: 'locker', x: 60 }];
  const world = testWorld({ width: 80, playerX: 22, guards: [sentry('g', 20)], hideSpots });
  runUntil(world, () => state(world) === 'alert', {}, 2);
  // Break line of sight by getting behind him, then slip into the nearby locker unseen.
  loseHim(world.guards[0]);
  world.player.x = 27;
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, 'near');
  runUntil(world, () => state(world) === 'searching', {}, 20);
  runUntil(world, () => world.grab !== null, {}, 20);
  assert.equal(world.player.hiddenIn, null, 'he pulled the player out');
  // Step 14: one hunt is one spotting, however many times he loses you and finds you.
  assert.equal(world.stats.timesSpotted, 1);
});

test('a hiding spot far from where he lost you is safe', () => {
  const hideSpots = [{ id: 'near', type: 'locker', x: 27 }, { id: 'far', type: 'locker', x: 60 }];
  const world = testWorld({ width: 80, playerX: 22, guards: [sentry('g', 20)], hideSpots });
  runUntil(world, () => state(world) === 'alert', {}, 2);
  loseHim(world.guards[0]);
  world.player.x = 60;
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, 'far');
  runUntil(world, () => state(world) === 'searching', {}, 20);
  runUntil(world, () => state(world) === 'calm', {}, G.searchSeconds + 5);
  assert.equal(world.grab, null);
  assert.equal(world.player.hiddenIn, 'far');
});

test('two searching guards split up instead of checking the same spot', () => {
  const hideSpots = [{ id: 'a', type: 'locker', x: 24 }, { id: 'b', type: 'cart', x: 28 }];
  const world = testWorld({ width: 80, playerX: 22, guards: [sentry('g1', 20), sentry('g2', 32, -1)], hideSpots });
  runUntil(world, () => state(world) === 'alert', {}, 2);
  world.guards.forEach(loseHim);
  world.player.x = 70;
  runUntil(world, () => world.guards.every((g) => g.checkingSpotId), {}, 20);
  assert.notEqual(world.guards[0].checkingSpotId, world.guards[1].checkingSpotId);
});

test('Searching to Alert: seen again while he is searching', () => {
  const world = testWorld({ width: 80, playerX: 22, guards: [sentry('g', 20)] });
  runUntil(world, () => state(world) === 'alert', {}, 2);
  run(world, { moveX: 1, run: true }, 6);
  runUntil(world, () => state(world) === 'searching', { moveX: 1, crouch: true }, 20);
  const guard = world.guards[0];
  // Stay in front of him, wherever he turns, until his meter is full again.
  runUntil(world, () => {
    world.player.x = guard.x + guard.facing * 3;
    return state(world) === 'alert';
  }, {}, 4);
  assert.equal(world.stats.timesSpotted, 1, 'still the same hunt: it counts once');
});

test('hiding while a guard is watching does not work', () => {
  const hideSpots = [{ id: 'locker', type: 'locker', x: 25 }];
  const world = testWorld({ playerX: 25, guards: [sentry('g', 20)], hideSpots });
  runUntil(world, () => state(world) === 'suspicious', {}, 3);
  tap(world, 'up');
  assert.equal(state(world), 'alert', 'he saw you get in');
  assert.equal(world.guards[0].knownSpotId, 'locker');
  runUntil(world, () => world.grab !== null, {}, 5);
});

test('a pitch-dark spot hides you only while you stand still', () => {
  const hideSpots = [{ id: 'dark', type: 'dark', x: 24, halfWidth: 1.5 }];
  const world = testWorld({ playerX: 24, guards: [sentry('g', 20)], hideSpots });
  run(world, {}, 3);
  assert.equal(world.player.inDark, 'dark');
  assert.equal(state(world), 'calm');
  assert.equal(world.guards[0].detection, 0);
  // Crouching in place is still standing still.
  run(world, { crouch: true }, 1);
  assert.equal(state(world), 'calm');
  // Moving gives you away, even inside the dark spot.
  run(world, { moveX: 1, crouch: true }, 0.1);
  assert.equal(world.player.inDark, null);
  assert.ok(world.guards[0].detection > 0);
});

test('the alert meter shows the highest level among the guards', () => {
  const world = testWorld({ playerX: 26.5, guards: [sentry('a', 20), sentry('b', 2, -1)] });
  assert.deepEqual(alertSummary(world), { level: 'calm', fill: 0 });
  run(world, {}, 0.2);
  assert.equal(alertSummary(world).level, 'calm');
  assert.ok(alertSummary(world).fill > 0, 'the bar fills while a guard is noticing you');
  runUntil(world, () => state(world, 0) === 'suspicious', {}, 2);
  assert.equal(alertSummary(world).level, 'suspicious');
  runUntil(world, () => state(world, 0) === 'alert', {}, 3);
  assert.deepEqual(alertSummary(world), { level: 'alert', fill: 1 });
});

test('the same inputs always give the same result', () => {
  const play = () => {
    const world = testWorld({ width: 80, playerX: 22, guards: [sentry('g', 20), sentry('h', 50, -1)] });
    run(world, { moveX: 1, run: true }, 5);
    run(world, { moveX: -1, crouch: true }, 10);
    return JSON.stringify([world.player.x, world.guards.map((g) => [g.x, g.state, g.detection])]);
  };
  assert.equal(play(), play());
});
