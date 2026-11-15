// Step 8 (playtest 2): guards wake up, radio check-ins, and the 7:00 timer.
// The choke hold from this step was taken out again in Step 9.
import test from 'node:test';
import assert from 'node:assert/strict';
import { shownState } from '../site/js/game/alert.js';
import { CONFIG } from '../site/js/game/config.js';
import { knockOut, wakeProgress } from '../site/js/game/knockout.js';
import { currentMessage } from '../site/js/game/messages.js';
import { guardPost, onRadioNow } from '../site/js/game/radio.js';
import { createWorld } from '../site/js/game/world.js';
import {
  eventTypes, guardById, knock, prisonWorld, run, runUntil, tap, testWorld,
} from './helpers.mjs';

const K = CONFIG.knockout;
const sentry = (id, x, facing = 1) => ({ id, patrol: [x, x], startX: x, facing });
const locker = { id: 'locker', type: 'locker', x: 14 };
const behindGuard = (extra = {}) => testWorld({ playerX: 19.2, guards: [sentry('g', 20)], ...extra });

// ---------- Guards wake up ----------

test('wake-up: a knocked-out guard is warned about, then wakes after 75 seconds and searches', () => {
  assert.equal(K.wakeSeconds, 75);
  const world = behindGuard();
  knock(world);
  const guard = world.guards[0];
  world.player.x = 2;
  run(world, {}, K.wakeSeconds - K.wakeWarningSeconds - 1);
  assert.equal(guard.wakeWarned, false);
  assert.ok(Math.abs(wakeProgress(guard) - (guard.outFor / K.wakeSeconds)) < 1e-9);
  run(world, {}, 1.5);
  assert.equal(guard.state, 'out');
  assert.match(currentMessage(world), /starting to stir/);
  world.events.length = 0;
  run(world, {}, K.wakeWarningSeconds);
  assert.equal(guard.state, 'searching');
  assert.ok(eventTypes(world).includes('wake'));
  assert.equal(guard.searchOrigin, guard.x, 'he searches around where he woke up');
});

test('wake-up: he stays wary for the rest of the run', () => {
  const world = behindGuard();
  knock(world);
  const guard = world.guards[0];
  world.player.x = 2;
  run(world, {}, K.wakeSeconds + CONFIG.guard.searchSeconds + 10);
  assert.equal(guard.state, 'calm');
  assert.equal(guard.wary, true);
  assert.equal(shownState(guard), 'suspicious');
  assert.equal(guard.bodyFound, false);
});

test('wake-up: a guard in a locker bangs on it, the noise brings another guard, then he climbs out', () => {
  const guards = [sentry('g', 20), sentry('other', 8, -1)];
  const world = behindGuard({ guards, hideSpots: [locker] });
  knock(world);
  tap(world, 'action');
  runUntil(world, () => Math.abs(world.player.x - locker.x) < 0.3, { moveX: -1 }, 10);
  tap(world, 'up');
  const [guard, other] = world.guards;
  assert.equal(guard.hiddenIn, 'locker');
  world.player.x = 38;
  run(world, {}, K.wakeSeconds - guard.outFor - 0.5);
  assert.equal(eventTypes(world).filter((type) => type === 'bang').length, 0);
  assert.equal(other.state, 'calm');

  run(world, {}, 1);
  assert.equal(guard.state, 'out', 'still shut in while he bangs');
  assert.equal(guard.hiddenIn, 'locker');
  assert.match(currentMessage(world), /Banging from inside a locker.*waking up/);
  assert.equal(other.state, 'suspicious');
  assert.equal(other.targetX, locker.x, 'the other guard walks to the noise');

  run(world, {}, K.bangSeconds);
  const bangs = eventTypes(world).filter((type) => type === 'bang').length;
  assert.equal(bangs, Math.ceil(K.bangSeconds / K.bangEverySeconds));
  assert.equal(guard.hiddenIn, null, 'he is out of the locker');
  assert.equal(guard.state, 'searching');
  assert.equal(guard.x, locker.x);
  assert.ok(K.bangRadius > CONFIG.noise.runRadius, 'banging is louder than running');
});

test('wake-up: a body you are dragging is dropped when he wakes', () => {
  const world = behindGuard();
  knock(world);
  tap(world, 'action');
  assert.equal(world.player.dragging, 'g');
  run(world, {}, K.wakeSeconds + 0.5);
  assert.equal(world.player.dragging, null);
  assert.notEqual(world.guards[0].state, 'out');
});

test('wake-up: it happens in rooms the player is not in', () => {
  const world = prisonWorld('maintenance', 5);
  const guard = guardById(world, 'la-guard');
  knockOut(world, guard);
  // Nobody is sent to check in this test: take everyone else off the radio.
  for (const other of world.allGuards) other.radioAt = null;
  run(world, {}, K.wakeSeconds + 1);
  assert.equal(guard.state, 'searching');
  assert.equal(guard.wary, true);
});

// ---------- Radio check-ins ----------

test('radio: every patrolling guard checks in on a fixed beat, the same every run', () => {
  const R = CONFIG.radio;
  const world = createWorld();
  const onRadio = world.allGuards.filter((guard) => !guard.sleeper);
  const expected = onRadio.map((_, i) => R.firstSeconds + i * R.staggerSeconds);
  assert.deepEqual(onRadio.map((guard) => guard.radioAt), expected);
  assert.equal(guardById(world, 'go-guard').radioAt, null, 'the sleeping guard is off the radio');
  const calls = [];
  for (let second = 0; second < 150; second += 1) {
    run(world, {}, 1);
    for (const event of world.events.filter((entry) => entry.type === 'checkIn')) {
      calls.push(`${event.guardId}@${second}`);
    }
    world.events.length = 0;
  }
  const again = createWorld();
  const callsAgain = [];
  for (let second = 0; second < 150; second += 1) {
    run(again, {}, 1);
    for (const event of again.events.filter((entry) => entry.type === 'checkIn')) {
      callsAgain.push(`${event.guardId}@${second}`);
    }
    again.events.length = 0;
  }
  assert.deepEqual(calls, callsAgain);
  const first = calls.filter((call) => call.startsWith('cb-guard@'));
  assert.deepEqual(first, ['cb-guard@20', 'cb-guard@80', 'cb-guard@140']);
  // The last guard on the list (a Yard tower guard since Step 11) calls in last.
  const lastId = onRadio.at(-1).id;
  const last = calls.filter((call) => call.startsWith(`${lastId}@`));
  const lastFirst = R.firstSeconds + (onRadio.length - 1) * R.staggerSeconds;
  assert.deepEqual(last, [`${lastId}@${lastFirst}`, `${lastId}@${lastFirst + R.intervalSeconds}`]);
  assert.ok(calls.includes('sw-guard@52'), 'guards inside the prison call in when they always did');
});

test('radio: a guard who checks in shows the radio icon for a moment', () => {
  const world = createWorld();
  const guard = guardById(world, 'cb-guard');
  run(world, {}, CONFIG.radio.firstSeconds - 0.5);
  assert.equal(onRadioNow(guard, world), false);
  run(world, {}, 1);
  assert.equal(onRadioNow(guard, world), true);
  run(world, {}, CONFIG.radio.showSeconds);
  assert.equal(onRadioNow(guard, world), false);
});

test('radio: guards have names for the radio', () => {
  const world = createWorld();
  assert.equal(guardById(world, 'la-guard').label, 'Laundry guard');
  assert.equal(guardById(world, 'mh-guard-2').label, 'Mess Hall guard 2');
});

test('radio: a missed check-in sends the nearest awake guard in the same room to the post', () => {
  const world = prisonWorld('cell-block', 2);
  const missing = guardById(world, 'mh-guard-1');
  const partner = guardById(world, 'mh-guard-2');
  knockOut(world, missing);
  missing.hiddenIn = 'mh-table-1';
  run(world, {}, missing.radioAt - world.time + 0.1);
  assert.ok(eventTypes(world).includes('missedCheckIn'));
  const said = /Radio: "No answer from the Mess Hall guard 1\.\.\. Mess Hall guard 2, go and check\."/;
  assert.match(currentMessage(world), said);
  assert.equal(partner.state, 'suspicious');
  assert.equal(partner.targetX, guardPost(missing));
  assert.equal(partner.roomId, 'mess-hall');
  assert.equal(partner.duty, null);
});

test('radio: with nobody else in the room, a guard from next door walks over, looks, and walks home', () => {
  const world = prisonWorld('maintenance', 5);
  const missing = guardById(world, 'la-guard');
  const sent = guardById(world, 'cb-guard');
  knockOut(world, missing);
  missing.hiddenIn = 'la-cart-1';
  run(world, {}, missing.radioAt - world.time + 0.1);
  assert.match(currentMessage(world), /No answer from the Laundry guard\.\.\. Cell Block guard, go and check/);
  assert.equal(sent.duty.type, 'radio');
  assert.equal(sent.roomId, 'cell-block');

  runUntil(world, () => sent.roomId === 'laundry', {}, 30);
  assert.equal(sent.x, 2, 'he comes in by the stairs');
  assert.equal(sent.state, 'suspicious');
  assert.equal(sent.targetX, guardPost(missing));

  runUntil(world, () => sent.roomId === 'cell-block', {}, 60);
  assert.equal(sent.duty, null);
  assert.equal(sent.x, 1.3);
  run(world, {}, 20);
  assert.ok(sent.x >= sent.patrolMin - 0.01 && sent.x <= sent.patrolMax + 0.01, 'and goes back to his patrol');
});

test('radio: the guard who walks over joins the room the player is in', () => {
  const world = prisonWorld('laundry', 21.5);
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, 'la-cart-3');
  const missing = guardById(world, 'la-guard');
  knockOut(world, missing);
  missing.hiddenIn = 'la-cart-1';
  const sent = guardById(world, 'cb-guard');
  runUntil(world, () => sent.roomId === 'laundry', {}, 90);
  assert.ok(world.guards.includes(sent));
  runUntil(world, () => sent.roomId === 'cell-block', {}, 60);
  assert.ok(!world.guards.includes(sent));
});

test('radio: a body left in the open is found by the guard who comes to look, even with the player gone', () => {
  const world = prisonWorld('maintenance', 5);
  const missing = guardById(world, 'la-guard');
  const sent = guardById(world, 'cb-guard');
  knockOut(world, missing);
  runUntil(world, () => world.stats.bodiesFound === 1, {}, 80);
  assert.equal(sent.roomId, 'laundry');
  assert.match(currentMessage(world), /Man down in the Laundry/);
  // He still walks home when he has finished searching.
  runUntil(world, () => sent.roomId === 'cell-block' && sent.duty === null, {}, 90);
});

test('radio: when nobody is free, the radio says so', () => {
  const world = behindGuard();
  knock(world);
  world.player.x = 2;
  run(world, {}, CONFIG.radio.firstSeconds);
  assert.match(currentMessage(world), /No answer from the Test guard\.\.\. Nobody is free to check\./);
});

test('radio: an awake guard who is knocked out later stops answering, and answers again once he wakes', () => {
  const world = behindGuard();
  const guard = world.guards[0];
  run(world, {}, CONFIG.radio.firstSeconds + 1);
  assert.equal(eventTypes(world).filter((type) => type === 'checkIn').length, 1);
  world.player.x = 19.2;
  knock(world);
  world.player.x = 2;
  run(world, {}, CONFIG.radio.intervalSeconds);
  assert.equal(eventTypes(world).filter((type) => type === 'missedCheckIn').length, 1);
  run(world, {}, CONFIG.radio.intervalSeconds + 20);
  assert.notEqual(guard.state, 'out');
  assert.equal(eventTypes(world).filter((type) => type === 'checkIn').length, 2);
});

test('the bed check waits for a guard who is next door on a radio check', () => {
  const world = prisonWorld('maintenance', 5);
  const missing = guardById(world, 'la-guard');
  const checker = guardById(world, 'cb-guard');
  knockOut(world, missing);
  missing.hiddenIn = 'la-cart-1';
  runUntil(world, () => checker.roomId === 'laundry', {}, 80);
  world.timeLeft = CONFIG.bedCheckAtSecondsRemaining - 1;
  run(world, {}, 1);
  assert.equal(world.bedCheck, null, 'not while he is away');
  runUntil(world, () => world.bedCheck !== null, {}, 60);
  assert.equal(checker.roomId, 'cell-block');
});

// ---------- Timer ----------

test('timer: the run is 7:00 and the bed check is at 3:30 remaining', () => {
  assert.equal(CONFIG.headcountSeconds, 7 * 60);
  assert.equal(CONFIG.bedCheckAtSecondsRemaining, 3.5 * 60);
  const world = createWorld();
  assert.equal(world.timeLeft, 420);
  run(world, {}, 209);
  assert.equal(world.bedCheck, null);
  run(world, {}, 1.5);
  assert.notEqual(world.bedCheck, null);
});
