// Step 17: the shove gets its own button, a grab during the stagger, and falls off ledges.
// The reproductions are from docs/reviews/codex-review-1-shove.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { intentFromGamepad, intentFromKeys } from '../site/js/game/intent.js';
import { currentMessage } from '../site/js/game/messages.js';
import { playtestText, spottedByText } from '../site/js/game/playtest.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { scoreRun } from '../site/js/game/run.js';
import { ledgeFor, shoveCharge, staggerLeft } from '../site/js/game/shove.js';
import { holdOptions } from '../site/js/game/takedown.js';
import { createWorld } from '../site/js/game/world.js';
import {
  STEP, eventTypes, guardById, prisonWorld, run, runUntil, tap, testWorld,
} from './helpers.mjs';

const S = CONFIG.shove;
const K = CONFIG.knockout;
const sentry = (id, x, facing = 1, extra = {}) => ({ id, patrol: [x, x], startX: x, facing, ...extra });
const happened = (world, type) => eventTypes(world).includes(type);
const down = { state: 'out', outFor: -1e6, radioAt: null };
const prompt = (world) => currentPrompt(world)?.text ?? null;

// A guard at 20 with his back to a player `gap` metres behind him.
const behind = (gap, extra = {}) => testWorld({ width: 80, playerX: 20 - gap, guards: [sentry('g', 20)], ...extra });
// A guard at 20 facing a player `gap` metres in front of him.
const inFront = (gap, extra = {}) => testWorld({ width: 80, playerX: 20 + gap, guards: [sentry('g', 20)], ...extra });

// Tower 1 as in the review: patrols run for two seconds with the player out of the way, then
// the player is put on the platform at x. The ground guard is taken out of it.
function onTowerOne(x) {
  const world = prisonWorld('yard', x);
  for (const camera of world.cameras) camera.off = true;
  Object.assign(guardById(world, 'yd-guard'), down);
  Object.assign(guardById(world, 'yd-tower-2'), down);
  world.player.y = 5.8;
  world.events.length = 0;
  return { world, tower: guardById(world, 'yd-tower-1') };
}

// ---------- 1. A dedicated button, and a Space that never shoves ----------

test('button: shove is R on the keyboard and Left Trigger on the controller, and clashes with nothing', () => {
  const keys = intentFromKeys(new Set(['KeyR']));
  assert.equal(keys.shove, true);
  assert.deepEqual(Object.entries(keys).filter(([name, value]) => name !== 'shove' && value), []);
  assert.equal(intentFromKeys(new Set(['Space'])).shove, false, 'Space is not shove');
  const pad = (index, value = 1) => intentFromGamepad({
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === index, value: i === index ? value : 0 })),
    axes: [0, 0],
  });
  const trigger = pad(6);
  assert.equal(trigger.shove, true);
  assert.deepEqual(Object.entries(trigger).filter(([name, value]) => name !== 'shove' && value), []);
  // No other controller button shoves, and every button still does at most what it did.
  for (let index = 0; index < 17; index += 1) {
    if (index !== 6) assert.equal(pad(index).shove, false, `button ${index}`);
  }
  assert.equal(pad(2).action, true, 'X is still grab');
  assert.equal(pad(4).throw, true, 'Left Bumper is still throw');
  assert.equal(pad(7, 1).run, true, 'Right Trigger is still run');
});

test('Space never shoves: in front of a guard it does nothing, and R is what shoves', () => {
  const world = inFront(1);
  assert.equal(prompt(world), 'R: shove');
  tap(world, 'action');
  const guard = world.guards[0];
  assert.ok(!happened(world, 'shove'));
  assert.equal(guard.stun, 0);
  assert.equal(world.stats.shoves, 0);
  tap(world, 'shove');
  assert.ok(happened(world, 'shove'));
  assert.equal(world.stats.shoves, 1);
});

test('behind an unaware guard: 1.09 m grabs. 1.11 m and 1.39 m raise no alarm, whatever you press', () => {
  assert.equal(K.reach, 1.1);
  const close = behind(1.09);
  assert.equal(prompt(close), 'SPACE: grab');
  tap(close, 'action');
  assert.equal(close.guards[0].state, 'held');
  for (const gap of [1.11, 1.39]) {
    const world = behind(gap);
    const guard = world.guards[0];
    assert.equal(prompt(world), 'Move closer to grab', `${gap} m: told to move closer`);
    tap(world, 'action');
    tap(world, 'action');
    assert.equal(guard.state, 'calm', `${gap} m: Space did nothing loud (it shoved before Step 17)`);
    assert.equal(prompt(world), 'Move closer to grab');
    // The shove button does nothing to a guard who has not seen you, and says why.
    tap(world, 'shove');
    assert.equal(prompt(world), "He hasn't seen you: grab instead");
    assert.equal(currentPrompt(world).shake, true);
    run(world, {}, 2);
    assert.equal(guard.state, 'calm');
    assert.ok(!happened(world, 'shove') && !happened(world, 'alert') && !happened(world, 'suspicious'));
    assert.deepEqual([world.stats.timesSpotted, world.stats.shoves], [0, 0]);
  }
});

test('the review\'s Tower 1 table: behind the guard at 0.8, 1.2, and 1.4 m, two presses of Space', () => {
  const results = [35.4, 35.8, 36].map((x) => {
    const { world, tower } = onTowerOne(x);
    tap(world, 'action');
    tap(world, 'action');
    run(world, {}, 2.5);
    const light = world.cameras.find((camera) => camera.id === 'yd-light-1');
    const spotted = world.stats.timesSpotted;
    return { x, state: tower.state, spotted, grabbed: Boolean(world.grab), lightOff: light.off };
  });
  // 0.8 m: a quiet knockout, as before.
  assert.equal(results[0].state, 'out');
  assert.equal(results[0].spotted, 0);
  // 1.2 m and 1.4 m: before, a shove, an Alert, and a grab two seconds later. Now nothing.
  for (const row of results.slice(1)) {
    assert.equal(row.state, 'calm', `at ${row.x}`);
    assert.equal(row.spotted, 0);
    assert.equal(row.grabbed, false);
  }
});

test('a guard who turns round as you come up behind him: Space still does nothing loud', () => {
  const world = behind(3);
  const guard = world.guards[0];
  runUntil(world, () => 20 - world.player.x < 1.3, { moveX: 1, crouch: true }, 4);
  assert.equal(prompt(world), 'Move closer to grab');
  // He turns to face you just before you are in reach.
  Object.assign(guard, { facing: -1, postFacing: -1 });
  tap(world, 'action');
  assert.ok(!happened(world, 'shove'), 'the press meant as a grab is not turned into a shove');
  assert.equal(guard.stun, 0);
  assert.equal(prompt(world), 'R: shove', 'and the prompt now offers the shove, on its own button');
});

test('a frontal shove still interrupts a lunge', () => {
  const world = inFront(5);
  const guard = world.guards[0];
  runUntil(world, () => guard.lunge > 0, {}, 10);
  world.events.length = 0;
  tap(world, 'shove');
  assert.ok(happened(world, 'shove'));
  assert.equal(guard.lunge, 0);
  run(world, { moveX: 1, run: true }, 1);
  assert.equal(world.grab, null);
});

// ---------- 2. Stun, then grab ----------

test('stagger: 1.5 s, with a stun bar that matches it and a cooldown that is a different clock', () => {
  assert.equal(S.stunSeconds, 1.5);
  assert.equal(S.cooldownSeconds, 8);
  const world = inFront(1);
  const guard = world.guards[0];
  assert.equal(staggerLeft(guard), null, 'no bar before');
  tap(world, 'shove');
  const start = staggerLeft(guard);
  assert.ok(start.share > 0.98 && Math.abs(start.seconds - 1.5) < 0.02);
  run(world, { moveX: 1, run: true }, 0.75);
  const half = staggerLeft(guard);
  assert.ok(Math.abs(half.share - 0.5) < 0.03, 'half way through, the bar is half');
  assert.ok(Math.abs(shoveCharge(world) - 0.75 / 8) < 0.02, 'while the shove has barely begun to recharge');
  run(world, { moveX: 1, run: true }, 0.8);
  assert.equal(staggerLeft(guard), null, 'he can act again: the bar is gone');
  assert.equal(guard.stun <= 0, true);
  assert.ok(shoveCharge(world) < 0.25, 'but you cannot shove again for six more seconds');
  run(world, { moveX: 1, run: true }, 6.5);
  assert.equal(shoveCharge(world), 1);
});

test('stagger: while he reels you can grab him, from the front or from behind', () => {
  for (const side of [1, -1]) {
    const world = inFront(1, { guards: [sentry('g', 20), sentry('other', 50, -1)] });
    const [guard, other] = world.guards;
    tap(world, 'shove');
    assert.equal(guard.state, 'alert');
    world.player.x = guard.x + side * 0.9;
    assert.equal(prompt(world), 'SPACE: grab');
    tap(world, 'action');
    assert.equal(guard.state, 'held', side > 0 ? 'from the front' : 'from behind');
    assert.equal(world.stats.knockouts, 0, 'no automatic knockout');
    assert.deepEqual(holdOptions(world).map((option) => option.id), ['knockOut', 'interrogate', 'slam', 'drag']);
    assert.equal(other.state, 'alert', 'the rest of the room is still after you');
    tap(world, 'action');
    assert.equal(guard.state, 'out');
    assert.equal(world.stats.takedowns.choke, 1);
  }
});

test('stagger: once it ends he cannot be grabbed', () => {
  const world = inFront(1);
  const guard = world.guards[0];
  tap(world, 'shove');
  run(world, {}, S.stunSeconds + 0.02);
  world.player.x = guard.x + guard.facing * -0.9;
  assert.notEqual(prompt(world), 'SPACE: grab');
  tap(world, 'action');
  assert.equal(world.hold, null);
  assert.equal(guard.state, 'alert');
});

test('stagger: the hint says to get away or grab, and points somewhere useful where it can', () => {
  const world = inFront(1.3);
  tap(world, 'shove');
  assert.equal(prompt(world), 'RUN / JUMP AWAY, or SPACE: grab');
  assert.equal(currentPrompt(world).x, world.guards[0].x, 'shown over the guard');
  // On Tower 1 the way out is the jump to the roof ledge, not "run" (which is off the edge).
  const { world: yard, tower } = onTowerOne(36.6);
  Object.assign(tower, { state: 'alert', react: 0, facing: 1, lastKnownX: 36.6 });
  tower.x = 35.2;
  tap(yard, 'shove');
  assert.ok(happened(yard, 'shove'));
  yard.player.x = 37;
  assert.equal(prompt(yard), 'JUMP LEFT to the roof ledge, or SPACE: grab');
});

// ---------- 3. Shove off ledges ----------

const platform = (from, to, top) => ({
  id: 'platform', kind: 'ledge', x: (from + to) / 2, halfWidth: (to - from) / 2, bottom: top - 0.25, top,
});

// A guard up on a platform from 20 to 26, facing a player who stands between him and the middle.
function onPlatform(top, guardX, extra = {}) {
  const guards = [sentry('g', guardX, -1, { y: top }), ...(extra.guards ?? [])];
  const world = testWorld({ width: 80, playerX: guardX - 1, ...extra, guards, solids: [platform(20, 26, top)] });
  world.player.y = top;
  return world;
}

test('ledge: near the edge the prompt is "R: shove off" and the tell points off it. In the middle it is not', () => {
  const near = onPlatform(3, 25);
  assert.equal(prompt(near), 'R: shove off');
  const tell = ledgeFor(near, near.guards[0]);
  assert.deepEqual([tell.side, tell.edgeX, tell.landY, tell.height], [1, 26, 0, 3]);
  const middle = onPlatform(3, 23.5);
  assert.equal(prompt(middle), 'R: shove');
  assert.equal(ledgeFor(middle, middle.guards[0]), null);
  tap(middle, 'shove');
  assert.ok(Math.abs(middle.guards[0].x - 24.5) < 0.01, 'an ordinary 1 m push');
  assert.equal(middle.guards[0].y, 3);
  // On the floor there is no edge to go off.
  assert.equal(ledgeFor(inFront(1), { x: 20, y: 0, roomId: 'test' }), null);
  assert.ok(S.pushMetres + S.edgeSlack >= 1.3);
});

test('ledge: he reels to the edge and falls along a real path, with no jump in position', () => {
  const world = onPlatform(3, 25);
  const guard = world.guards[0];
  tap(world, 'shove');
  assert.ok(happened(world, 'shoveOff'));
  assert.notEqual(guard.falling, null);
  let last = { x: guard.x, y: guard.y };
  let lowest = guard.y;
  let steps = 0;
  while (guard.falling) {
    run(world, {}, STEP);
    steps += 1;
    assert.ok(Math.abs(guard.x - last.x) <= S.reelSpeed * STEP + 1e-9, 'he never jumps sideways');
    assert.ok(Math.abs(guard.y - last.y) <= CONFIG.moves.maxFallSpeed * STEP + 0.01, 'or downwards');
    assert.ok(guard.y <= last.y + 1e-9, 'and never goes up');
    if (guard.y === 3) assert.ok(guard.x <= 26.5 + 1e-6);
    lowest = Math.min(lowest, guard.y);
    last = { x: guard.x, y: guard.y };
    assert.ok(steps < 600);
  }
  assert.equal(guard.y, 0, 'he lands on the floor');
  assert.ok(Math.abs(guard.x - (26 + S.fallClear)) < 0.01, 'just clear of the platform');
  assert.equal(lowest, 0);
  assert.ok(steps * STEP > 0.5, `the fall took ${(steps * STEP).toFixed(2)} s`);
});

test('ledge: a fall of 2 m or more knocks him out. His body lies in the open and can be found', () => {
  assert.equal(S.fallKnockoutMetres, 2);
  const world = onPlatform(3, 25, { guards: [sentry('ground', 40, -1)] });
  const [guard, ground] = world.guards;
  tap(world, 'shove');
  runUntil(world, () => !guard.falling, {}, 3);
  assert.equal(guard.state, 'out');
  assert.equal(guard.hiddenIn, null);
  assert.ok(happened(world, 'knockout') && happened(world, 'fallLand'));
  assert.equal(world.stats.knockouts, 1);
  assert.deepEqual(world.stats.takedowns, { choke: 0, above: 0, pullIn: 0, ledge: 1 });
  assert.deepEqual([world.stats.shoves, world.stats.shovedOff], [1, 1]);
  // It is loud: heard 12 m away, far further than the shove itself.
  run(world, {}, STEP);
  assert.ok(world.pings.some((ping) => ping.radius === S.fallNoiseRadius));
  assert.ok(S.fallNoiseRadius > S.noiseRadius);
  // The guard on the ground comes over and finds him.
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => world.stats.bodiesFound === 1, {}, 20);
  assert.ok(ground.x < 40);
  // He wakes on the usual timer, down on the ground, with no platform to keep him.
  runUntil(world, () => guard.state !== 'out', {}, CONFIG.knockout.wakeSeconds + 2);
  assert.equal(guard.y, 0);
  assert.equal(guard.bounds, null);
});

test('ledge: a shorter fall winds him for 3 s, then he gets up Alert', () => {
  assert.equal(S.shortFallStunSeconds, 3);
  const world = onPlatform(1.2, 25);
  const guard = world.guards[0];
  tap(world, 'shove');
  runUntil(world, () => !guard.falling, {}, 3);
  assert.equal(guard.y, 0);
  assert.equal(guard.state, 'alert', 'not knocked out');
  assert.ok(Math.abs(guard.stun - 3) < 0.05);
  assert.ok(Math.abs(staggerLeft(guard).share - 1) < 0.02, 'with a stun bar for it');
  assert.equal(world.stats.knockouts, 0);
  assert.equal(world.stats.shovedOff, 1);
  const lay = guard.x;
  world.player.y = 0;
  world.player.x = 35;
  run(world, {}, 2.8);
  assert.equal(guard.x, lay, 'down for the three seconds');
  run(world, {}, 1.5);
  assert.ok(guard.x > lay, 'then up and after you');
});

test('ledge, Tower 1: an Alert tower guard shoved off his tower. Knocked out, loud, and his light goes dark', () => {
  const { world, tower } = onTowerOne(35.6);
  const ground = guardById(world, 'yd-guard');
  Object.assign(ground, { state: 'calm', outFor: 0, x: 39, facing: 1, radioAt: 400 });
  const light = world.cameras.find((camera) => camera.id === 'yd-light-1');
  light.off = false;
  // He has turned on you. You are between him and the ladder, so the shove sends him west.
  Object.assign(tower, { state: 'alert', react: 0, facing: 1, lastKnownX: 35.6, hunting: true });
  assert.equal(prompt(world), 'R: shove off');
  tap(world, 'shove');
  runUntil(world, () => !tower.falling, {}, 4);
  assert.equal(tower.state, 'out');
  assert.equal(tower.y, 0, 'on the ground at the foot of the tower');
  assert.ok(tower.x < 33.5);
  assert.equal(light.off, true, 'his searchlight is dark for the rest of the run');
  assert.match(currentMessage(world), /searchlight goes dark/);
  assert.equal(world.stats.shovedOff, 1);
  // Loud: the ground guard heard it and is on his way. He finds the body.
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => world.stats.bodiesFound === 1, {}, 25);
  // And the radio notices, like any knockout.
  const quiet = onTowerOne(35.6);
  Object.assign(quiet.tower, { state: 'alert', react: 0, facing: 1, lastKnownX: 35.6, hunting: true });
  tap(quiet.world, 'shove');
  quiet.world.player.hiddenIn = 'elsewhere';
  runUntil(quiet.world, () => happened(quiet.world, 'missedCheckIn'), {}, 140);
  assert.match(currentMessage(quiet.world), /No answer from the Tower 1 guard/);
});

test('ledge: the review\'s clamp table. At the tower edge the push was 0 m. Now he goes off', () => {
  // Guard at 37.2, the east limit of his beat, shoved east by a player on his west side.
  const { world, tower } = onTowerOne(36.5);
  Object.assign(tower, { x: 37.2, state: 'alert', react: 0, facing: -1, lastKnownX: 36.5, hunting: true });
  assert.equal(prompt(world), 'R: shove off');
  tap(world, 'shove');
  runUntil(world, () => !tower.falling, {}, 4);
  assert.ok(tower.x > 37.5 && tower.y === 0);
  assert.equal(tower.state, 'out');
  // In the middle of the platform he is only pushed, and stays up.
  const middle = onTowerOne(36.3);
  Object.assign(middle.tower, { x: 35.5, state: 'alert', react: 0, facing: 1, lastKnownX: 36.3, hunting: true });
  tap(middle.world, 'shove');
  run(middle.world, {}, 0.5);
  assert.equal(middle.tower.y, 5.8);
  assert.equal(middle.tower.falling, null);
});

test('ledge: the quiet takedown is still the stealthy way. No noise, no Alert, no spotting', () => {
  const { world, tower } = onTowerOne(35.4);
  tap(world, 'action');
  tap(world, 'action');
  assert.equal(tower.state, 'out');
  assert.equal(tower.y, 5.8, 'up on his tower, out of sight of the ground');
  assert.deepEqual([world.stats.timesSpotted, world.stats.shoves, world.stats.shovedOff], [0, 0, 0]);
  assert.ok(!world.pings.some((ping) => ping.radius >= S.noiseRadius));
});

// ---------- 4. Clear targets ----------

test('targets: with two guards in play the prompt names the one it means', () => {
  // On Tower 1 with its guard on his feet beside you and the ground guard under the platform.
  const { world, tower } = onTowerOne(36.2);
  const ground = guardById(world, 'yd-guard');
  const under = { x: 36.2, patrolMin: 36.2, patrolMax: 36.2, facing: 1 };
  Object.assign(ground, under, { state: 'calm', outFor: 0, radioAt: 400 });
  Object.assign(tower, { state: 'alert', react: 0.6, stun: 0, facing: 1, lastKnownX: 36.2, hunting: true });
  world.shoveReadyAt = Infinity;
  assert.equal(prompt(world), 'SPACE: drop on the Yard guard', 'it is a drop, and on whom');
  assert.equal(currentPrompt(world).x, ground.x, 'the prompt sits on that guard');
  world.shoveReadyAt = 0;
  // With the shove ready, the drop is still what Space does, and the prompt still says so.
  assert.equal(prompt(world), 'SPACE: drop on the Yard guard');
  // One guard alone is just "him".
  const alone = testWorld({ playerX: 19.2, guards: [sentry('g', 20)] });
  assert.equal(prompt(alone), 'SPACE: grab');
  // Two guards close together: the grab names its target too.
  const pair = testWorld({ playerX: 19.2, guards: [sentry('g', 20), sentry('h', 21.5)] });
  assert.equal(prompt(pair), 'SPACE: grab the Test guard 1');
});

test('targets: Space does what the prompt says, even with another guard under the tower', () => {
  // Found in the browser: 1.4 m behind the Tower 1 guard with the ground guard passing below,
  // the prompt said "Move closer to grab" but Space dropped on the ground guard.
  const { world, tower } = onTowerOne(36);
  const ground = guardById(world, 'yd-guard');
  const under = { x: 36, patrolMin: 36, patrolMax: 36, facing: 1 };
  Object.assign(ground, under, { state: 'calm', outFor: 0, radioAt: 400 });
  assert.equal(prompt(world), 'Move closer to grab');
  tap(world, 'action');
  assert.equal(world.player.y, 5.8, 'still on the tower');
  assert.equal(ground.state, 'calm');
  assert.equal(tower.state, 'calm');
  assert.equal(world.stats.knockouts, 0);
  // Step away from the tower guard and the drop is offered, and Space does that.
  world.player.x = 37.2;
  Object.assign(ground, { x: 37.2, patrolMin: 37.2, patrolMax: 37.2 });
  run(world, {}, 1);
  assert.equal(prompt(world), 'SPACE: drop on him');
  tap(world, 'action');
  assert.equal(ground.state, 'out');
});

// ---------- 5. Actions and sightings counted apart ----------

test('score: two shoves in one hunt are two actions and one spotting', () => {
  const world = inFront(1);
  const guard = world.guards[0];
  tap(world, 'shove');
  world.shoveReadyAt = 0;
  run(world, {}, 0.3);
  world.player.x = guard.x + 1;
  tap(world, 'shove');
  assert.equal(world.stats.shoves, 2);
  assert.equal(world.stats.timesSpotted, 1);
  assert.equal(world.stats.spottedBy.shove, 1);
  assert.equal(world.stats.spottedBy.other, 0, 'and it is no longer lumped under "other"');
  world.over = 'win';
  const result = scoreRun(world);
  assert.deepEqual([result.shoves, result.shovedOff], [2, 0]);
  const text = playtestText(result, []);
  assert.match(text, /Shoves: 2\. Shoved off ledges: 0\./);
  assert.match(text, /Spotted by: guards 0, cameras 0, searchlights 0, snitches 0, your shoves 1\./);
});

test('score: sleeper woke, empty bed, and a guard breaking free each have their own name', () => {
  // The sleeper wakes with you still in the office.
  const office = prisonWorld('guard-office', 10.5);
  tap(office, 'interact');
  runUntil(office, () => guardById(office, 'go-guard').state === 'alert', {}, 8);
  assert.equal(office.stats.spottedBy.sleeperWoke, 1);
  // The bed check finds your bed empty.
  const late = createWorld();
  late.player.hiddenIn = null;
  late.player.x = 29;
  late.timeLeft = CONFIG.bedCheckAtSecondsRemaining + 0.5;
  runUntil(late, () => late.bedCheck?.result === 'empty', {}, 40);
  assert.equal(late.stats.spottedBy.emptyBed, 1);
  // A guard you held too long breaks free.
  const held = testWorld({ playerX: 19.2, guards: [sentry('g', 20)] });
  tap(held, 'action');
  run(held, {}, CONFIG.takedown.holdSeconds + 0.2);
  assert.equal(held.stats.spottedBy.brokeFree, 1);
  for (const world of [office, late, held]) {
    assert.equal(world.stats.spottedBy.shove, 0, 'none of them is called a shove');
    assert.equal(world.stats.spottedBy.other, 0);
    assert.equal(world.stats.shoves, 0);
  }
  assert.equal(
    spottedByText({ guard: 2, camera: 0, searchlight: 0, snitch: 0, shove: 1, sleeperWoke: 1, emptyBed: 1 }),
    'guards 2, cameras 0, searchlights 0, snitches 0, your shoves 1, sleeper woke 1, empty bed 1',
  );
});
