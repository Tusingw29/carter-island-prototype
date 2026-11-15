// Step 9 (playtest 3): seen is not caught. The reaction pause, the chase, the lunge, losing a
// guard, instant knockouts from behind, and the "how you got caught" line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { alarmCauseText, caughtHowText } from '../site/js/game/caught.js';
import { CONFIG } from '../site/js/game/config.js';
import { playtestText } from '../site/js/game/playtest.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import {
  eventTypes, run, runUntil, tap, testWorld,
} from './helpers.mjs';

const G = CONFIG.guard;
const sentry = (id, x, facing = 1) => ({ id, patrol: [x, x], startX: x, facing });
const locker = { id: 'locker', type: 'locker', x: 60 };
const happened = (world, type) => eventTypes(world).includes(type);

// A guard at 20 facing right, with the player `gap` metres in front of him, in a long room.
function facingGuard(gap, extra = {}) {
  return testWorld({ width: 120, playerX: 20 + gap, guards: [sentry('g', 20)], ...extra });
}

// Steps until the guard goes Alert, and returns the game time at which he did.
function untilAlert(world, keys = {}) {
  return runUntil(world, () => world.guards[0].state === 'alert', keys, 5);
}

// ---------- The reaction pause ----------

test('reaction: a guard who goes Alert freezes for 0.6 s before he moves', () => {
  assert.equal(G.reactSeconds, 0.6);
  const world = facingGuard(5);
  untilAlert(world);
  const guard = world.guards[0];
  assert.ok(Math.abs(guard.react - G.reactSeconds) < 0.02);
  const stoodAt = guard.x;
  run(world, {}, G.reactSeconds - 0.05);
  assert.equal(guard.x, stoodAt, 'still frozen');
  assert.equal(world.grab, null);
  run(world, {}, 0.3);
  assert.ok(guard.x > stoodAt, 'then he comes');
});

test('reaction: close-up sight fills the meter fast but still ends in the pause, never an instant grab', () => {
  const world = facingGuard(0.5);
  const alertAt = untilAlert(world);
  assert.ok(alertAt < 0.5, 'up close he is sure very quickly');
  run(world, {}, G.reactSeconds + G.lungeWindupSeconds - 0.05);
  assert.equal(world.grab, null, 'no grab until the pause and the wind-up are over');
  run(world, {}, 0.2);
  assert.notEqual(world.grab, null);
});

test('reaction: every guard the alarm reaches gets the same pause', () => {
  const world = testWorld({ width: 120, playerX: 25, guards: [sentry('g', 20), sentry('far', 60, -1)] });
  untilAlert(world);
  assert.equal(world.guards[1].state, 'alert');
  run(world, {}, G.reactSeconds - 0.05);
  assert.equal(world.guards[1].x, 60);
});

// ---------- The chase ----------

test('chase: guards run at about 80% of the player\'s run speed, and faster than a walk', () => {
  const share = G.alertSpeed / CONFIG.player.runSpeed;
  assert.ok(share >= 0.75 && share <= 0.85, `chase speed is ${Math.round(share * 100)}% of run speed`);
  assert.ok(G.alertSpeed > CONFIG.player.walkSpeed);
  assert.equal(CONFIG.player.runSpeed, 6.5, 'the run speed Adam likes is unchanged');
});

test('chase: a running player always pulls away and is never grabbed', () => {
  const world = facingGuard(1.5);
  untilAlert(world, { moveX: 1, run: true });
  const gapAtAlert = world.player.x - world.guards[0].x;
  let smallest = Infinity;
  for (let i = 0; i < 40; i += 1) {
    run(world, { moveX: 1, run: true }, 0.1);
    smallest = Math.min(smallest, world.player.x - world.guards[0].x);
    assert.equal(world.grab, null);
  }
  assert.ok(smallest >= gapAtAlert, 'the gap never shrinks');
  assert.ok(world.player.x - world.guards[0].x > gapAtAlert + 3);
});

test('chase: a walking player is caught up with', () => {
  const world = facingGuard(4);
  untilAlert(world, { moveX: 1 });
  runUntil(world, () => world.grab !== null, { moveX: 1 }, 15);
});

// ---------- The lunge ----------

test('lunge: a grab is not instant on contact. He winds up for 0.35 s first', () => {
  assert.equal(G.lungeWindupSeconds, 0.35);
  const world = facingGuard(3);
  untilAlert(world);
  runUntil(world, () => happened(world, 'lunge'), {}, 5);
  const guard = world.guards[0];
  assert.ok(world.player.x - guard.x <= G.lungeTriggerRange + 0.05, 'it starts when he is close');
  const startedAt = guard.x;
  run(world, {}, G.lungeWindupSeconds - 0.03);
  assert.equal(world.grab, null, 'nothing yet');
  assert.equal(guard.x, startedAt, 'he stands still while he winds up');
  run(world, {}, 0.06);
  assert.notEqual(world.grab, null, 'then it lands on a player who stood still');
});

test('lunge: run when he winds up and you are out of reach. He misses and stumbles', () => {
  const world = facingGuard(3);
  untilAlert(world);
  runUntil(world, () => happened(world, 'lunge'), {}, 5);
  run(world, { moveX: 1, run: true }, G.lungeWindupSeconds + 0.05);
  assert.equal(world.grab, null);
  assert.ok(happened(world, 'lungeMiss'));
  const guard = world.guards[0];
  assert.ok(guard.stun > 0.5, 'he is stumbling');
  const stumbledAt = guard.x;
  run(world, { moveX: 1, run: true }, 0.5);
  assert.equal(guard.x, stumbledAt);
  assert.equal(G.lungeMissSeconds, 0.9);
});

test('lunge: dodge past him and he lunges at empty air', () => {
  const world = facingGuard(3);
  untilAlert(world);
  runUntil(world, () => happened(world, 'lunge'), {}, 5);
  run(world, { moveX: -1, run: true }, G.lungeWindupSeconds + 0.05);
  assert.equal(world.grab, null);
  assert.ok(happened(world, 'lungeMiss'));
  assert.ok(world.player.x < world.guards[0].x, 'the player is behind him now');
});

test('lunge: walking away is not enough to get clear of it', () => {
  const world = facingGuard(3);
  untilAlert(world);
  runUntil(world, () => happened(world, 'lunge'), {}, 5);
  run(world, { moveX: 1 }, G.lungeWindupSeconds + 0.05);
  assert.notEqual(world.grab, null);
});

test('lunge: the one break-free chance is still there, and the second grab still ends the run', () => {
  const world = facingGuard(1);
  runUntil(world, () => world.grab !== null, {}, 5);
  for (let i = 0; i < CONFIG.grab.mashNeeded; i += 1) tap(world, 'action');
  assert.equal(world.grab, null);
  assert.equal(world.breakFreeUsed, true);
  runUntil(world, () => world.over !== null, {}, 15);
  assert.equal(world.over, 'caught');
});

// ---------- Losing them ----------

test('losing a guard: out of his sight for 2 seconds and he goes to Searching where he last saw you', () => {
  assert.equal(G.loseSightSeconds, 2);
  const world = facingGuard(5);
  untilAlert(world);
  const guard = world.guards[0];
  // Get far down the room, well beyond the reach of his flashlight.
  world.player.x = guard.x + 60;
  run(world, {}, 0.05);
  assert.equal(guard.seesPlayer, false);
  const lostAt = world.time;
  runUntil(world, () => guard.state === 'searching', {}, 10);
  const took = world.time - lostAt;
  assert.ok(took > G.loseSightSeconds - 0.1 && took < G.loseSightSeconds + 0.2, `took ${took} s`);
  assert.equal(guard.searchOrigin, guard.lastKnownX, 'he searches around the last place he knew you were');
});

test('losing a guard: while he can still see you the chase goes on', () => {
  const world = facingGuard(5);
  untilAlert(world);
  run(world, { moveX: 1, run: true }, 0.3);
  const guard = world.guards[0];
  for (let i = 0; i < 20; i += 1) {
    run(world, { moveX: 1, run: true }, 0.1);
    if (guard.seesPlayer) assert.equal(guard.state, 'alert');
  }
});

test('losing a guard: a hiding spot he did not see you get into still works', () => {
  const world = facingGuard(5, { hideSpots: [locker] });
  untilAlert(world);
  const guard = world.guards[0];
  // Out of his sight for a moment, then on to a locker well away from where he lost you.
  world.player.x = locker.x - 2 * G.searchRadius;
  run(world, {}, G.trackSeconds + 0.1);
  assert.equal(guard.seesPlayer, false, 'too far for his beam');
  world.player.x = locker.x;
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, 'locker');
  runUntil(world, () => guard.state === 'searching', {}, 10);
  runUntil(world, () => guard.state === 'calm', {}, 60);
  assert.equal(world.grab, null);
  assert.equal(world.over, null);
});

test('losing a guard: a hiding spot he watched you get into does not', () => {
  const near = { id: 'near', type: 'locker', x: 23 };
  const world = facingGuard(3, { hideSpots: [near] });
  untilAlert(world);
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, 'near');
  runUntil(world, () => world.grab !== null, {}, 8);
});

// ---------- Knockouts ----------

test('knockout: from behind when he has not seen you. A grab, then a choke (Step 12)', () => {
  const world = testWorld({ playerX: 19.2, guards: [sentry('g', 20)] });
  assert.equal(currentPrompt(world).text, 'SPACE: grab');
  tap(world, 'action');
  assert.equal(world.guards[0].state, 'held');
  tap(world, 'action');
  assert.equal(world.guards[0].state, 'out');
  assert.equal(world.stats.knockouts, 1);
  assert.ok(happened(world, 'knockout'), 'with the hit feedback event');
  assert.equal(world.stats.timesSpotted, 0);
});

test('knockout: refused from the front. The button shoves him instead (Step 10)', () => {
  const world = testWorld({ playerX: 20.8, guards: [sentry('g', 20)] });
  assert.equal(currentPrompt(world).text, 'SPACE: shove');
  tap(world, 'action');
  const guard = world.guards[0];
  assert.notEqual(guard.state, 'out');
  assert.equal(world.stats.knockouts, 0);
  assert.ok(happened(world, 'shove'));
});

test('knockout: refused on a guard who is already Alert, even from behind', () => {
  const world = facingGuard(5);
  untilAlert(world);
  const guard = world.guards[0];
  world.player.x = guard.x - 0.8;
  world.events.length = 0;
  tap(world, 'action');
  assert.notEqual(guard.state, 'out');
  assert.equal(world.stats.knockouts, 0);
  assert.ok(happened(world, 'shove'));
});

// ---------- How you got caught ----------

test('score: "how you got caught" gives the seconds from the "!" to the grab and what caused the "!"', () => {
  const world = facingGuard(0.6);
  world.breakFreeUsed = true;
  const alertAt = untilAlert(world);
  runUntil(world, () => world.over !== null, {}, 5);
  assert.equal(world.over, 'caught');
  const seconds = world.lastGrab.sinceAlarm;
  assert.ok(Math.abs(seconds - (world.lastGrab.at - alertAt)) < 0.02);
  assert.ok(seconds >= G.reactSeconds + G.lungeWindupSeconds - 0.02, 'never less than the pause plus the wind-up');
  assert.equal(world.lastGrab.alarmKind, 'closeSight');
  const expected = `Grabbed ${seconds.toFixed(1)} s after the "!". The Test guard saw you up close.`;
  assert.equal(world.result.caughtHow, expected);
  assert.match(playtestText(world.result, []), /How: Grabbed \d\.\d s after the "!"/);
});

test('score: the cause is told apart: flashlight, hiding spot, body, sleeping guard, empty bed', () => {
  const beam = facingGuard(6);
  untilAlert(beam);
  assert.equal(beam.lastAlarm.kind, 'beam');
  assert.equal(alarmCauseText('beam', 'Mess Hall guard 1'), 'The Mess Hall guard 1 saw you in his flashlight');
  assert.match(alarmCauseText('watchedHiding', 'Laundry guard'), /watched you get into a hiding spot/);
  assert.match(alarmCauseText('foundHiding', 'Laundry guard'), /found you in a hiding spot/);
  assert.match(alarmCauseText('body', 'Laundry guard'), /found a knocked-out guard/);
  assert.match(alarmCauseText('wokeSleeper', null), /sleeping guard woke up/);
  assert.match(alarmCauseText('emptyBed', null), /bed was found empty/);
  assert.equal(caughtHowText(beam), null, 'nothing to say until there is a grab');
  const won = facingGuard(30);
  assert.equal(won.result, null);
});
