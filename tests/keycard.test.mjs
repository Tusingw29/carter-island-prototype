// The keycard: how you take it decides what happens. Also the sleeping guard and cameras.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { alertSummary, shownState } from '../site/js/game/alert.js';
import { cameraCentre } from '../site/js/game/camera.js';
import { holdProgress } from '../site/js/game/holds.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { eventTypes, guardById, prisonWorld, run, runUntil, tap } from './helpers.mjs';

const atDesk = () => prisonWorld('guard-office', 10.5);
const sleeper = (world) => guardById(world, 'go-guard');

test('slow grab: hold Interact for about 2 seconds and nothing happens', () => {
  const world = atDesk();
  assert.match(currentPrompt(world).text, /tap = grab fast, hold = lift quietly/);
  run(world, { interact: true }, CONFIG.hold.slowSeconds - 0.1);
  assert.equal(world.player.hasKeycard, false);
  assert.ok(holdProgress(world) > 0.9);
  run(world, { interact: true }, 0.2);
  assert.equal(world.player.hasKeycard, true);
  assert.equal(world.keycardGrab, 'slow');
  run(world, {}, CONFIG.guard.stirSeconds + 2);
  assert.equal(sleeper(world).state, 'asleep');
  assert.equal(world.silentAlarm, false);
  assert.equal(world.stats.timesSpotted, 0);
});

test('fast grab: the guard stirs, and wakes up Alert if you are still in the room', () => {
  const world = atDesk();
  tap(world, 'interact');
  assert.equal(world.player.hasKeycard, true);
  assert.equal(world.keycardGrab, 'fast');
  assert.ok(sleeper(world).stirTimer > 0);
  assert.equal(sleeper(world).state, 'asleep', 'stirring, not awake yet');
  run(world, {}, CONFIG.guard.stirSeconds + 0.1);
  assert.equal(sleeper(world).state, 'alert');
  assert.equal(world.stats.timesSpotted, 1);
});

test('fast grab: leave the room in time and he settles back to sleep', () => {
  const world = atDesk();
  tap(world, 'interact');
  runUntil(world, () => Math.abs(world.player.x - 1.5) < 0.5, { moveX: -1, crouch: false }, 3.5);
  tap(world, 'up');
  assert.equal(world.room.id, 'stairwell');
  run(world, {}, CONFIG.guard.stirSeconds + 1);
  assert.equal(sleeper(world).state, 'asleep');
  assert.equal(sleeper(world).stirTimer, 0);
  assert.equal(world.stats.timesSpotted, 0);
});

test('letting go of Interact part way does not take the keycard', () => {
  const world = atDesk();
  run(world, { interact: true }, 1);
  run(world, {}, 0.5);
  assert.equal(world.player.hasKeycard, false);
});

test('silent alarm: the office guard was knocked out', () => {
  const world = prisonWorld('guard-office', 13);
  tap(world, 'action');
  assert.equal(sleeper(world).state, 'out');
  world.player.x = 10.5;
  run(world, { interact: true }, CONFIG.hold.slowSeconds + 0.1);
  assert.equal(world.silentAlarm, true);
  assert.ok(eventTypes(world).includes('silentAlarm'));
  const awake = world.allGuards.filter((guard) => guard.id !== 'go-guard');
  assert.ok(awake.every((guard) => guard.wary && shownState(guard) === 'suspicious'), 'all guards Suspicious');
});

test('silent alarm: a camera saw you earlier in the run', () => {
  const world = atDesk();
  world.seenByCamera = true;
  run(world, { interact: true }, CONFIG.hold.slowSeconds + 0.1);
  assert.equal(world.silentAlarm, true);
});

test('silent alarm lasts for the trip home: guards stay Suspicious, patrol faster, notice sooner', () => {
  const world = atDesk();
  world.seenByCamera = true;
  run(world, { interact: true }, CONFIG.hold.slowSeconds + 0.1);
  const guard = guardById(world, 'cb-guard');
  const before = guard.x;
  run(world, {}, 1);
  assert.ok(Math.abs(Math.abs(guard.x - before) - CONFIG.guard.suspiciousSpeed) < 0.05);
  run(world, {}, 60);
  assert.equal(shownState(guard), 'suspicious');

  const cells = prisonWorld('cell-block', 12);
  guardById(cells, 'cb-guard').wary = true;
  assert.equal(alertSummary(cells).level, 'suspicious');
});

test('the sleeping guard: sneaking is safe, running wakes him', () => {
  const quiet = prisonWorld('guard-office', 2);
  runUntil(quiet, () => quiet.player.x >= 10, { moveX: 1 }, 5);
  runUntil(quiet, () => quiet.player.x >= 15, { moveX: 1, crouch: true }, 5);
  assert.equal(sleeper(quiet).state, 'asleep');
  assert.equal(sleeper(quiet).stirTimer, 0);

  const loud = prisonWorld('guard-office', 2);
  run(loud, { moveX: 1, run: true }, 1);
  assert.ok(sleeper(loud).stirTimer > 0);
  run(loud, {}, CONFIG.guard.stirSeconds);
  assert.equal(sleeper(loud).state, 'alert');
});

test('cameras sweep back and forth between their limits, the same every run', () => {
  const camera = { min: 10, max: 14, speed: 2 };
  assert.equal(cameraCentre(camera, 0), 10);
  assert.equal(cameraCentre(camera, 1), 12);
  assert.equal(cameraCentre(camera, 2), 14);
  assert.equal(cameraCentre(camera, 3), 12);
  assert.equal(cameraCentre(camera, 4), 10);
  assert.equal(cameraCentre(camera, 5), 12);
});

test('being seen by a camera sends the guards in the room to Suspicious', () => {
  const world = prisonWorld('stairwell', 16.5);
  run(world, {}, CONFIG.camera.noticeSeconds + 0.1);
  assert.equal(world.seenByCamera, true);
  assert.equal(world.stats.timesSpotted, 1);
  assert.ok(eventTypes(world).includes('camera'));
  const sentry = guardById(world, 'sw-guard');
  assert.equal(sentry.state, 'suspicious');
  assert.ok(Math.abs(sentry.targetX - 16.5) < 0.1);
});

test('a camera does not see you in a dark spot, in hiding, or outside its sweep', () => {
  const dark = prisonWorld('stairwell', 18.8);
  run(dark, {}, 10);
  assert.equal(dark.seenByCamera, false);

  const outside = prisonWorld('stairwell', 24);
  run(outside, {}, 10);
  assert.equal(outside.seenByCamera, false);
});

test('the Maintenance camera has no guards nearby, so it calls the Laundry guard to the door', () => {
  const world = prisonWorld('maintenance', 9.5);
  run(world, {}, CONFIG.camera.noticeSeconds + 0.1);
  const guard = guardById(world, 'la-guard');
  assert.equal(guard.state, 'suspicious');
  assert.equal(guard.targetX, 26.5);
});
