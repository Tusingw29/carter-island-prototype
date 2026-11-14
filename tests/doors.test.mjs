// Creaky doors: tap Up = fast and loud, hold Up = slow and quiet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { holdProgress } from '../site/js/game/holds.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { eventTypes, guardById, prisonWorld, run, runUntil, tap } from './helpers.mjs';

const atOfficeDoor = () => prisonWorld('stairwell', 24);

test('holding Up for about 2 seconds opens a creaky door quietly', () => {
  const world = atOfficeDoor();
  assert.match(currentPrompt(world).text, /tap = fast and loud, hold = slow and quiet/);
  run(world, { up: true }, CONFIG.hold.slowSeconds - 0.1);
  assert.equal(world.room.id, 'stairwell', 'not open yet');
  assert.ok(holdProgress(world) > 0.9);
  run(world, { up: true }, 0.2);
  assert.equal(world.room.id, 'guard-office');
  assert.ok(!eventTypes(world).includes('doorLoud'));
  run(world, {}, 1);
  assert.equal(guardById(world, 'sw-guard').state, 'calm', 'the checkpoint guard heard nothing');
  assert.equal(guardById(world, 'go-guard').stirTimer, 0, 'the sleeping guard heard nothing');
});

test('tapping Up opens a creaky door at once, and guards on both sides hear it', () => {
  const office = atOfficeDoor();
  tap(office, 'up');
  assert.equal(office.room.id, 'guard-office');
  assert.ok(eventTypes(office).includes('doorLoud'));
  run(office, {}, 0.1);
  assert.ok(guardById(office, 'go-guard').stirTimer > 0, 'the sleeping guard on the far side stirs');

  const laundry = prisonWorld('laundry', 26.5);
  const guard = guardById(laundry, 'la-guard');
  guard.x = 19;
  tap(laundry, 'up');
  assert.equal(laundry.room.id, 'maintenance');
  assert.equal(guard.state, 'suspicious', 'the guard on the near side heard it');
  assert.equal(guard.targetX, 26.5, 'he comes to look at the door');
});

test('letting go of Up part way cancels the slow open', () => {
  const world = atOfficeDoor();
  run(world, { up: true }, 1);
  run(world, {}, 0.5);
  assert.equal(world.room.id, 'stairwell');
  assert.equal(holdProgress(world), null);
  assert.equal(guardById(world, 'sw-guard').state, 'calm');
});

test('walking away from the door cancels the slow open', () => {
  const world = atOfficeDoor();
  run(world, { up: true }, 1);
  run(world, { up: true, moveX: -1 }, 2);
  assert.equal(world.room.id, 'stairwell');
});

test('a guard far from a slammed door does not hear it', () => {
  const world = prisonWorld('laundry', 26.5);
  const guard = guardById(world, 'la-guard');
  guard.x = 26.5 - CONFIG.door.slamRadius - 1;
  tap(world, 'up');
  assert.equal(world.room.id, 'maintenance');
  assert.equal(guard.state, 'calm');
});

test('stairs and plain doors open on a single press, silently', () => {
  const world = prisonWorld('cell-block', 1.3);
  assert.equal(currentPrompt(world).text, 'UP: stairs down');
  tap(world, 'up');
  assert.equal(world.room.id, 'laundry');
  assert.ok(!eventTypes(world).includes('doorLoud'));
});

test('guards do not follow you out of a room, but the alarm makes the next room suspicious', () => {
  const world = prisonWorld('mess-hall', 34.5);
  const chaser = guardById(world, 'mh-guard-2');
  Object.assign(chaser, { x: 31, facing: 1, patrolDir: 1 });
  runUntil(world, () => chaser.state === 'alert', {}, 2);
  runUntil(world, () => world.room.id === 'stairwell', { moveX: 1, run: true }, 3);
  assert.equal(chaser.state, 'searching', 'he lost you at the archway');
  assert.equal(chaser.roomId, 'mess-hall');
  assert.equal(guardById(world, 'sw-guard').state, 'suspicious');
  runUntil(world, () => chaser.state === 'calm', {}, 40);
});
