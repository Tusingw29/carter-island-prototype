// The bed check at 3:30 remaining, and the dummy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { shownState } from '../site/js/game/alert.js';
import { currentMessage } from '../site/js/game/messages.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { ROOMS } from '../site/js/game/rooms.js';
import { createWorld } from '../site/js/game/world.js';
import { eventTypes, guardById, prisonWorld, run, runUntil, tap } from './helpers.mjs';

const CHECK_AT = CONFIG.bedCheckAtSecondsRemaining;

// Jumps a world to just before the bed check.
function nearBedCheck(world) {
  world.timeLeft = CHECK_AT + 0.5;
  return world;
}
const finished = (world) => world.bedCheck?.result;

test('the bed check starts when the timer hits 3:30 remaining, not before', () => {
  assert.equal(CHECK_AT, 210);
  const world = nearBedCheck(createWorld());
  run(world, {}, 0.3);
  assert.equal(world.bedCheck, null);
  run(world, {}, 0.3);
  assert.notEqual(world.bedCheck, null);
  assert.ok(eventTypes(world).includes('bedCheck'));
  assert.match(currentMessage(world), /Bed check/);
  assert.equal(guardById(world, 'cb-guard').duty.type, 'bedCheck');
});

test('a guard walks to your cell to look', () => {
  const world = nearBedCheck(createWorld());
  runUntil(world, finished, {}, 30);
  const guard = guardById(world, 'cb-guard');
  const bed = ROOMS['cell-block'].hideSpots.find((spot) => spot.type === 'bed');
  assert.ok(Math.abs(guard.x - bed.x) < 2, 'he is standing at your bed');
  assert.equal(guard.facing, -1, 'looking at it');
});

test('you in bed: safe, and the guard goes back to his patrol', () => {
  const world = nearBedCheck(createWorld());
  runUntil(world, finished, {}, 30);
  assert.equal(world.bedCheck.result, 'in-bed');
  const guard = guardById(world, 'cb-guard');
  assert.equal(guard.state, 'calm');
  assert.equal(guard.duty, null);
  assert.equal(world.stats.timesSpotted, 0);
  runUntil(world, () => guard.x >= 9, {}, 20);
});

test('empty bed: Alert across the whole prison', () => {
  const world = nearBedCheck(prisonWorld('laundry', 26));
  runUntil(world, finished, {}, 30);
  assert.equal(world.bedCheck.result, 'empty');
  assert.ok(eventTypes(world).includes('lockdown'));
  assert.ok(eventTypes(world).filter((type) => type === 'alert').length >= 5, 'every awake guard went Alert');
  assert.match(currentMessage(world), /bed is empty/);
  assert.equal(world.stats.timesSpotted, 1);
  run(world, {}, 60);
  const awake = world.allGuards.filter((guard) => guard.id !== 'go-guard');
  assert.ok(awake.every((guard) => shownState(guard) !== 'calm'), 'they stay on edge for the rest of the run');
});

test('an empty bed does not end the run: you can still get back and win', () => {
  const world = nearBedCheck(prisonWorld('vent-duct', 10));
  world.player.hasKeycard = true;
  runUntil(world, finished, {}, 30);
  assert.equal(world.over, null);
});

test('the bedsheets are in the Laundry', () => {
  const world = prisonWorld('laundry', 5.2);
  assert.equal(currentPrompt(world).text, 'E: take the bedsheets');
  tap(world, 'interact');
  assert.equal(world.player.hasBedsheets, true);
});

test('with the bedsheets you can make a dummy in your bed', () => {
  const world = prisonWorld('cell-block', 5.2);
  guardById(world, 'cb-guard').x = 21;
  tap(world, 'interact');
  assert.equal(world.dummyInBed, false, 'nothing to make it from yet');
  world.player.hasBedsheets = true;
  assert.equal(currentPrompt(world).text, 'E: make a dummy in your bed');
  tap(world, 'interact');
  assert.equal(world.dummyInBed, true);
  assert.equal(world.player.hasBedsheets, false);
  assert.ok(eventTypes(world).includes('dummy'));
});

test('dummy in bed: the guard walks on', () => {
  const world = nearBedCheck(prisonWorld('laundry', 26));
  world.dummyInBed = true;
  runUntil(world, finished, {}, 30);
  assert.equal(world.bedCheck.result, 'dummy');
  assert.ok(!eventTypes(world).includes('lockdown'));
  assert.equal(world.stats.timesSpotted, 0);
  assert.ok(world.allGuards.every((guard) => guard.state === 'calm' || guard.state === 'asleep'));
});

test('you can still get into bed with the dummy in it, and sleep to win', () => {
  const world = prisonWorld('cell-block', 4.5);
  guardById(world, 'cb-guard').x = 21;
  world.dummyInBed = true;
  world.player.hasKeycard = true;
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, 'bed');
  tap(world, 'interact');
  assert.equal(world.over, 'win');
});

test('there is only one bed check per run', () => {
  const world = nearBedCheck(createWorld());
  runUntil(world, finished, {}, 30);
  world.events.length = 0;
  run(world, {}, 60);
  assert.ok(!eventTypes(world).includes('bedCheck'));
});

test('a busy guard does the check once he has calmed down', () => {
  const world = nearBedCheck(createWorld());
  const guard = guardById(world, 'cb-guard');
  Object.assign(guard, { state: 'suspicious', targetX: 20, lookTimer: 0, lookFlipped: false });
  run(world, {}, 1);
  assert.equal(world.bedCheck.result, null);
  runUntil(world, finished, {}, 40);
  assert.equal(world.bedCheck.result, 'in-bed');
});

test('if the Cell Block guard is knocked out, nobody does the check', () => {
  const world = nearBedCheck(prisonWorld('laundry', 26));
  guardById(world, 'cb-guard').state = 'out';
  run(world, {}, 2);
  assert.equal(world.bedCheck.result, 'skipped');
  assert.ok(!eventTypes(world).includes('lockdown'));
});
