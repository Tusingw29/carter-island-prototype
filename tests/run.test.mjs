// The headcount timer, how a run ends, and score and rank.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { rankFor, RANKS, scoreRun } from '../site/js/game/run.js';
import { createWorld } from '../site/js/game/world.js';
import { eventTypes, guardById, prisonWorld, run, tap } from './helpers.mjs';

test('the timer starts at the configured length and counts down in real seconds', () => {
  const world = createWorld();
  assert.equal(world.timeLeft, CONFIG.headcountSeconds);
  run(world, {}, 10);
  assert.ok(Math.abs(world.timeLeft - (CONFIG.headcountSeconds - 10)) < 0.01);
});

test('the timer length comes from config', () => {
  const world = createWorld(undefined, { ...CONFIG, headcountSeconds: 480 });
  assert.equal(world.timeLeft, 480);
});

test('the timer never stops: not while hidden, and not while a guard holds you', () => {
  const hidden = createWorld();
  assert.equal(hidden.player.hiddenIn, 'bed');
  run(hidden, {}, 5);
  assert.ok(hidden.timeLeft < CONFIG.headcountSeconds - 4.9);

  const held = prisonWorld('cell-block', 12);
  held.grab = { guardId: 'cb-guard', presses: 0, timeLeft: 100 };
  const before = held.timeLeft;
  run(held, {}, 2);
  assert.ok(before - held.timeLeft > 1.9);
});

test('win: in bed with the keycard when the timer hits 0:00', () => {
  const world = createWorld();
  world.player.hasKeycard = true;
  world.timeLeft = 1;
  run(world, {}, 1.1);
  assert.equal(world.over, 'win');
  assert.equal(world.result.won, true);
  assert.equal(world.result.timeLeft, 0);
  assert.ok(eventTypes(world).includes('win'));
});

test('win early: the Sleep action in bed with the keycard', () => {
  const world = createWorld();
  world.player.hasKeycard = true;
  assert.match(currentPrompt(world).text, /sleep/);
  run(world, {}, 30);
  tap(world, 'interact');
  assert.equal(world.over, 'win');
  assert.ok(world.result.timeLeft > CONFIG.headcountSeconds - 31, 'the time left is kept for the score');
});

test('Sleep does nothing without the keycard, or while guards are hunting you', () => {
  const noCard = createWorld();
  tap(noCard, 'interact');
  assert.equal(noCard.over, null);

  const hunted = createWorld();
  hunted.player.hasKeycard = true;
  guardById(hunted, 'cb-guard').state = 'alert';
  guardById(hunted, 'cb-guard').lastKnownX = 20;
  tap(hunted, 'interact');
  assert.equal(hunted.over, null);
});

test('lose: out of bed at headcount', () => {
  const world = prisonWorld('laundry', 3);
  world.player.hasKeycard = true;
  world.timeLeft = 0.5;
  run(world, {}, 1);
  assert.equal(world.over, 'headcount');
  assert.equal(world.result.won, false);
  assert.equal(world.result.rank, 'caught');
});

test('lose: in bed at headcount but without the keycard', () => {
  const world = createWorld();
  world.timeLeft = 0.5;
  run(world, {}, 1);
  assert.equal(world.over, 'empty-handed');
  assert.equal(world.result.rank, 'caught');
});

test('lose: grabbed a second time', () => {
  const world = prisonWorld('cell-block', 12);
  const guard = guardById(world, 'cb-guard');
  Object.assign(guard, { x: 11, facing: 1 });
  world.breakFreeUsed = true;
  run(world, {}, 3);
  assert.equal(world.over, 'caught');
  assert.equal(world.result.rank, 'caught');
  assert.equal(world.result.timesSpotted, 1);
});

test('nothing moves after the run has ended', () => {
  const world = createWorld();
  world.timeLeft = 0.1;
  run(world, {}, 1);
  const frozen = JSON.stringify([world.time, world.allGuards.map((g) => g.x)]);
  run(world, { moveX: 1 }, 2);
  assert.equal(JSON.stringify([world.time, world.allGuards.map((g) => g.x)]), frozen);
});

test('ranks: Ghost, Shadow, Inmate, Caught', () => {
  assert.equal(rankFor({ won: true, timesSpotted: 0, knockouts: 0 }), 'ghost');
  assert.equal(rankFor({ won: true, timesSpotted: 0, knockouts: 2 }), 'shadow');
  assert.equal(rankFor({ won: true, timesSpotted: 1, knockouts: 0 }), 'inmate');
  assert.equal(rankFor({ won: true, timesSpotted: 3, knockouts: 4 }), 'inmate');
  assert.equal(rankFor({ won: false, timesSpotted: 0, knockouts: 0 }), 'caught');
  assert.deepEqual(Object.values(RANKS).map((rank) => rank.name), ['Ghost', 'Shadow', 'Inmate', 'Caught']);
});

test('the score screen numbers: time left, times spotted, knockouts, bodies found', () => {
  const world = createWorld();
  world.player.hasKeycard = true;
  world.stats = { timesSpotted: 2, knockouts: 1, bodiesFound: 1 };
  world.timeLeft = 123.4;
  world.over = 'win';
  assert.deepEqual(scoreRun(world), {
    outcome: 'win', won: true, rank: 'inmate', timeLeft: 123.4, timesSpotted: 2, knockouts: 1, bodiesFound: 1,
    silentAlarm: false, silentAlarmReason: null, keycardGrab: null, endedIn: 'Cell Block', caughtIn: null,
    caughtHow: null,
  });
});
