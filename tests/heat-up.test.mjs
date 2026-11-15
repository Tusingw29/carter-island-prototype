// Step 14: what counts as spotted, heat-up detection with a meter on every source, the clearer
// takedown menu, places to drop from, and a ghost marker you can notice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { awarenessMeters, stanceFactor } from '../site/js/game/awareness.js';
import { CONFIG } from '../site/js/game/config.js';
import { lastSeenMarkers } from '../site/js/game/lastseen.js';
import { playtestText, spottedByText } from '../site/js/game/playtest.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { PRISON, ROOMS } from '../site/js/game/rooms.js';
import { scoreRun } from '../site/js/game/run.js';
import { detectionRate } from '../site/js/game/senses.js';
import { sightBlockers } from '../site/js/game/sight.js';
import { TUTORIAL, nextTutorial } from '../site/js/game/tutorial.js';
import { createWorld } from '../site/js/game/world.js';
import {
  eventTypes, guardById, prisonWorld, run, runUntil, tap, testWorld,
} from './helpers.mjs';

// Every cause a spotting can be put down to, all at zero.
const NO_SPOTS = {
  guard: 0, camera: 0, searchlight: 0, snitch: 0, shove: 0, brokeFree: 0, sleeperWoke: 0, emptyBed: 0, other: 0,
};
const G = CONFIG.guard;
const A = CONFIG.awareness;
const sentry = (id, x, facing = 1) => ({ id, patrol: [x, x], startX: x, facing });
const happened = (world, type) => eventTypes(world).includes(type);
const count = (world, type) => eventTypes(world).filter((entry) => entry === type).length;
const camera = (x, extra = {}) => ({ id: 'cam', min: x, max: x, halfWidth: 3, speed: 0, ...extra });
// Walking on the spot against the left wall: moving, as far as anyone watching can tell.
const WALL = 0.5;
const WALKING = { moveX: -1 };
const down = { state: 'out', outFor: -1e6, radioAt: null };

// Holds Tower 1's searchlight still on the court at x = 20.
function holdLight(yard) {
  const light = yard.cameras.find((entry) => entry.id === 'yd-light-1');
  Object.assign(light, { min: 20, max: 20, speed: 0, awaySeconds: 0 });
}

// ---------- Spotted: once per sighting, and by what ----------

test('spotted: a camera counts one long stay in its view once, not once every few seconds', () => {
  const world = testWorld({ playerX: WALL, cameras: [camera(WALL)] });
  run(world, WALKING, 20);
  assert.equal(count(world, 'camera') > 3, true, 'it keeps calling your position in');
  assert.equal(world.stats.timesSpotted, 1, 'but that is one spotting (it was 5 before Step 14)');
  assert.deepEqual(world.stats.spottedBy, { ...NO_SPOTS, guard: 0, camera: 1, searchlight: 0, snitch: 0, other: 0 });
  // Leave until its meter has drained right down, then walk back in: that is a second one.
  world.player.x = 30;
  run(world, {}, 1 / A.drainPerSecond + 0.2);
  world.player.x = WALL;
  run(world, WALKING, 3);
  assert.equal(world.stats.timesSpotted, 2);
  // Stepping out for a moment and back in is still the same sighting.
  world.player.x = 30;
  run(world, {}, 0.5);
  world.player.x = WALL;
  run(world, WALKING, 6);
  assert.equal(world.stats.timesSpotted, 2);
});

test('spotted: a searchlight and a snitch count once per stay too', () => {
  const yard = prisonWorld('yard', 20);
  for (const guard of yard.guards) Object.assign(guard, down);
  holdLight(yard);
  yard.cameras.find((entry) => entry.id === 'yd-light-2').off = true;
  run(yard, {}, 20);
  assert.equal(yard.stats.spottedBy.searchlight, 1);
  assert.equal(yard.stats.timesSpotted, 1);
  const block = prisonWorld('cell-block', 16);
  Object.assign(guardById(block, 'cb-guard'), down);
  const snitch = block.snitches.find((entry) => entry.id === 'snitch-1');
  // Keep him looking this way for the whole test.
  for (let second = 0; second < 16; second += 1) {
    Object.assign(snitch, { facing: 1, lookTimer: 0 });
    run(block, {}, 1);
  }
  assert.ok(count(block, 'yell') >= 2, 'he yells more than once');
  assert.equal(block.stats.spottedBy.snitch, 1);
});

test('spotted: one hunt counts once, however many times the guard loses you and finds you', () => {
  const wall = { id: 'w', kind: 'wall', x: 30, halfWidth: 0.5, bottom: 0, top: 4 };
  const world = testWorld({ width: 80, playerX: 24, guards: [sentry('g', 20)], solids: [wall] });
  const guard = world.guards[0];
  runUntil(world, () => guard.state === 'alert', {}, 4);
  assert.equal(world.stats.timesSpotted, 1);
  for (let round = 0; round < 3; round += 1) {
    // Out of his sight until he starts searching, then back in front of him.
    world.player.x = 40;
    runUntil(world, () => guard.state === 'searching', {}, 12);
    runUntil(world, () => {
      world.player.x = Math.min(29, guard.x + guard.facing * 2.5);
      return guard.state === 'alert';
    }, {}, 6);
  }
  assert.equal(world.stats.timesSpotted, 1, 'three more Alerts, still the same hunt');
  assert.deepEqual(world.stats.spottedBy.guard, 1);
  // He gives up and calms down. Being seen after that is a new spotting.
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => guard.state === 'calm', {}, 60);
  world.player.hiddenIn = null;
  runUntil(world, () => {
    world.player.x = Math.min(29, guard.x + guard.facing * 2.5);
    return guard.state === 'alert';
  }, {}, 8);
  assert.equal(world.stats.timesSpotted, 2);
});

test('spotted: giving yourself away (a shove) and noise are told apart from being seen', () => {
  const world = testWorld({ playerX: 21, guards: [sentry('g', 20)] });
  tap(world, 'shove');
  assert.ok(happened(world, 'shove'));
  assert.deepEqual(world.stats.spottedBy, { ...NO_SPOTS, shove: 1 });
  // Noise alone never counts: it makes a guard Suspicious, not Alert.
  const noisy = testWorld({ playerX: 2, guards: [sentry('g', 20)] });
  noisy.player.hiddenIn = 'elsewhere';
  noisy.pendingNoises.push({ x: 14, radius: 8 });
  run(noisy, {}, 1);
  assert.equal(noisy.guards[0].state, 'suspicious');
  assert.equal(noisy.stats.timesSpotted, 0);
});

test('score: "Spotted by" gives a count for each source', () => {
  assert.equal(
    spottedByText({ ...NO_SPOTS, guard: 3, camera: 1, searchlight: 0, snitch: 2, other: 1 }),
    'guards 3, cameras 1, searchlights 0, snitches 2, other 1',
  );
  const world = testWorld({ playerX: WALL, cameras: [camera(WALL)] });
  run(world, WALKING, 3);
  world.over = 'win';
  const result = scoreRun(world);
  assert.deepEqual(result.spottedBy, { ...NO_SPOTS, guard: 0, camera: 1, searchlight: 0, snitch: 0, other: 0 });
  assert.equal(result.timesSpotted, 1);
  assert.match(playtestText(result, []), /Spotted by: guards 0, cameras 1, searchlights 0, snitches 0\./);
  const sum = Object.values(result.spottedBy).reduce((a, b) => a + b, 0);
  assert.equal(sum, result.timesSpotted, 'the counts add up to the total');
});

// ---------- Heat-up: fill times ----------

test('heat-up: a guard takes about 2.0 s at the far edge of his beam and 0.8 s up close', () => {
  assert.equal(G.detectFarSeconds, 2);
  assert.equal(G.detectNearSeconds, 0.8);
  assert.ok(Math.abs(1 / detectionRate({ state: 'calm' }, G.coneRange) - 2) < 1e-9);
  assert.ok(Math.abs(1 / detectionRate({ state: 'calm' }, 1) - 0.8) < 1e-9);
  // In the game, for a moving player right in front of him: no faster than 0.8 s, and no "!"
  // before the meter is full.
  const world = testWorld({ playerX: WALL, guards: [sentry('g', 1.4, -1)] });
  const guard = world.guards[0];
  run(world, WALKING, 0.4);
  assert.notEqual(guard.state, 'alert', 'not instant (it was 0.3 s before)');
  assert.ok(guard.detection > 0.3 && guard.detection < 1);
  const alertAt = runUntil(world, () => guard.state === 'alert', WALKING, 2);
  assert.ok(alertAt > 0.55 && alertAt <= 0.85, `alert after ${alertAt} s`);
  assert.ok(guard.react > 0, 'and then the reaction pause from Step 9');
});

// How long until a guard 5 m away first turns to look (a third full), for a way of moving.
function untilGlimpse(keys) {
  const world = testWorld({ playerX: WALL, guards: [sentry('g', 5.5, -1)] });
  return runUntil(world, () => world.guards[0].state === 'suspicious', keys, 8);
}

test('heat-up: crouching and standing still each halve the fill. Both together quarter it', () => {
  assert.equal(A.crouchFactor, 0.5);
  assert.equal(A.stillFactor, 0.5);
  assert.equal(stanceFactor({ crouching: false, speed: 3.2 }), 1);
  assert.equal(stanceFactor({ crouching: true, speed: 2.24 }), 0.5);
  assert.equal(stanceFactor({ crouching: false, speed: 0 }), 0.5);
  assert.equal(stanceFactor({ crouching: true, speed: 0 }), 0.25);
  const walking = untilGlimpse(WALKING);
  const crouchWalking = untilGlimpse({ moveX: -1, crouch: true });
  const standing = untilGlimpse({});
  const crouched = untilGlimpse({ crouch: true });
  assert.ok(Math.abs(crouchWalking / walking - 2) < 0.1, `crouch-walking ${crouchWalking} vs walking ${walking}`);
  assert.ok(Math.abs(standing / walking - 2) < 0.1);
  assert.ok(Math.abs(crouched / walking - 4) < 0.15);
});

test('heat-up: at a third full a guard turns to you with a "?", and only a full meter is the "!"', () => {
  assert.ok(Math.abs(G.glimpseThreshold - 1 / 3) < 0.01);
  const world = testWorld({ playerX: WALL, guards: [sentry('g', 6, -1)] });
  const guard = world.guards[0];
  runUntil(world, () => guard.state === 'suspicious', WALKING, 4);
  assert.ok(guard.detection >= G.glimpseThreshold && guard.detection < 0.4);
  assert.equal(world.stats.timesSpotted, 0);
  assert.ok(Math.abs(guard.targetX - WALL) < 0.1, 'he comes to look');
  runUntil(world, () => guard.state === 'alert', WALKING, 4);
  assert.equal(guard.detection, 1);
  assert.equal(world.stats.timesSpotted, 1);
});

test('heat-up: cameras and searchlights take about 1.2 s, with a beep that speeds up', () => {
  assert.equal(CONFIG.camera.fillSeconds, 1.2);
  const world = testWorld({ playerX: WALL, cameras: [camera(WALL)] });
  const beeps = [];
  const seenAt = runUntil(world, () => {
    if (world.events.at(-1)?.type === 'camBeep' && world.events.at(-1) !== beeps.at(-1)?.event) {
      beeps.push({ event: world.events.at(-1), at: world.time });
    }
    return world.seenByCamera;
  }, WALKING, 3);
  assert.ok(Math.abs(seenAt - 1.2) < 0.05, `called in after ${seenAt} s`);
  assert.ok(beeps.length >= 4, `${beeps.length} beeps on the way`);
  const gaps = beeps.slice(1).map((beep, i) => beep.at - beeps[i].at);
  assert.ok(gaps.at(-1) < gaps[0] * 0.6, 'the last gap is much shorter than the first');
  // Standing still in it takes twice as long, and a searchlight is the same.
  const still = testWorld({ playerX: 10, cameras: [camera(10)] });
  assert.ok(Math.abs(runUntil(still, () => still.seenByCamera, {}, 4) - 2.4) < 0.05);
  const yard = prisonWorld('yard', 20);
  for (const guard of yard.guards) Object.assign(guard, down);
  holdLight(yard);
  const lit = runUntil(yard, () => happened(yard, 'searchlight'), {}, 4);
  assert.ok(Math.abs(lit - 2.4) < 0.06, `a searchlight on someone standing still: ${lit} s`);
});

test('heat-up: a snitch takes about 1.0 s, and his meter shows while he squints at you', () => {
  assert.equal(CONFIG.snitch.fillSeconds, 1);
  const world = prisonWorld('cell-block', 16);
  Object.assign(guardById(world, 'cb-guard'), down);
  const snitch = world.snitches.find((entry) => entry.id === 'snitch-1');
  // Pace back and forth inside his view.
  let yelledAt = null;
  for (let i = 0; i < 30 && yelledAt === null; i += 1) {
    run(world, { moveX: i % 2 ? 1 : -1 }, 0.1);
    if (i === 4) {
      assert.ok(snitch.awareness > 0.3 && snitch.awareness < 0.7, 'filling: he is squinting');
      assert.ok(!happened(world, 'yell'), 'no yell yet');
      assert.ok(awarenessMeters(world).some((meter) => meter.id === 'snitch-1' && meter.kind === 'snitch'));
    }
    if (happened(world, 'yell')) yelledAt = world.time;
  }
  assert.ok(Math.abs(yelledAt - 1) < 0.11, `he yelled after ${yelledAt} s`);
});

// ---------- Heat-up: draining, and the meters themselves ----------

test('heat-up: out of sight the meter drains slowly, so stepping straight back in fills faster', () => {
  assert.ok(G.detectDrainPerSecond < 0.5 && A.drainPerSecond < 0.5);
  const world = testWorld({ playerX: 10, cameras: [camera(10)] });
  const cam = world.cameras[0];
  run(world, {}, 1.8);
  const reached = cam.awareness;
  assert.ok(reached > 0.7 && reached < 1);
  world.player.x = 30;
  run(world, {}, 0.5);
  assert.ok(Math.abs(reached - cam.awareness - 0.5 * A.drainPerSecond) < 0.01, 'half a second drains a little');
  assert.equal(world.seenByCamera, false);
  world.player.x = 10;
  const backAt = world.time;
  runUntil(world, () => world.seenByCamera, {}, 4);
  const again = world.time - backAt;
  const fresh = testWorld({ playerX: 10, cameras: [camera(10)] });
  const fromEmpty = runUntil(fresh, () => fresh.seenByCamera, {}, 4);
  assert.ok(again < fromEmpty * 0.5, `back in view it took ${again} s, from empty ${fromEmpty} s`);
  // A guard's meter drains the same slow way.
  const seen = testWorld({ playerX: 26, guards: [sentry('g', 20)] });
  const guard = seen.guards[0];
  run(seen, {}, 0.8);
  const level = guard.detection;
  seen.player.hiddenIn = 'elsewhere';
  run(seen, {}, 0.4);
  assert.ok(guard.detection > level - 0.4 * G.detectDrainPerSecond - 0.01 && guard.detection < level);
});

test('meters: every guard, camera, searchlight, and snitch has its own, shown over it', () => {
  // A guard and a camera in one room, both with the player in view.
  const world = testWorld({ playerX: WALL, guards: [sentry('g', 6, -1)], cameras: [camera(WALL)] });
  assert.deepEqual(awarenessMeters(world), [], 'nothing shown while everyone is unaware');
  run(world, WALKING, 0.5);
  const meters = awarenessMeters(world);
  assert.deepEqual(meters.map((meter) => meter.kind).sort(), ['camera', 'guard']);
  const [guardMeter] = meters.filter((meter) => meter.kind === 'guard');
  const [camMeter] = meters.filter((meter) => meter.kind === 'camera');
  assert.equal(guardMeter.id, 'g');
  assert.equal(guardMeter.x, world.guards[0].x);
  assert.ok(guardMeter.y > 2.5, 'over his head');
  assert.equal(guardMeter.fill, world.guards[0].detection);
  assert.ok(camMeter.y > 3.5, 'up at the camera');
  assert.ok(Math.abs(camMeter.fill - 0.5 / 1.2) < 0.02);
  assert.notEqual(guardMeter.fill, camMeter.fill, 'each fills at its own rate');
  assert.ok(meters.every((meter) => meter.seeing && !meter.full));
  // Out of view: still listed while it drains, marked as not seeing (drawn half faded).
  world.player.hiddenIn = 'elsewhere';
  run(world, {}, 0.3);
  const draining = awarenessMeters(world);
  assert.equal(draining.length, 2);
  assert.ok(draining.every((meter) => !meter.seeing && meter.fill > 0));
  run(world, {}, 4);
  assert.deepEqual(awarenessMeters(world).filter((meter) => meter.kind === 'camera'), []);
  // The Yard: a searchlight's meter is at its lamp, up the tower, which is often off screen.
  const yard = prisonWorld('yard', 20);
  for (const guard of yard.guards) Object.assign(guard, down);
  holdLight(yard);
  run(yard, {}, 0.5);
  const [lamp] = awarenessMeters(yard);
  assert.equal(lamp.kind, 'searchlight');
  assert.ok(lamp.y > 7 && Math.abs(lamp.x - 33.2) < 0.01);
});

test('meters: full is the "!" (Alert), and a rising sound steps up as the fullest one fills', () => {
  const world = testWorld({ playerX: WALL, guards: [sentry('g', 1.4, -1)] });
  runUntil(world, () => world.guards[0].state === 'alert', WALKING, 2);
  const steps = eventTypes(world).filter((type) => type.startsWith('heat'));
  assert.deepEqual(steps, ['heat1', 'heat2', 'heat3', 'heat4'], 'four rising notes before the "!"');
  const full = awarenessMeters(world).find((meter) => meter.id === 'g');
  assert.equal(full.full, true);
  assert.ok(eventTypes(world).indexOf('heat4') < eventTypes(world).indexOf('alert'));
});

// ---------- The takedown menu ----------

test('takedown: hints explain the menu the first time you grab someone, and it has a controls line', () => {
  const world = testWorld({ playerX: 19.2, guards: [sentry('g', 20)] });
  const seen = new Set(TUTORIAL.map((hint) => hint.id).filter((id) => id !== 'takedown'));
  assert.equal(nextTutorial(world, seen), null);
  tap(world, 'action');
  const hint = nextTutorial(world, seen);
  assert.equal(hint.id, 'takedown');
  assert.match(hint.text, /Q \(Y\) makes him talk/);
  assert.match(hint.text, /radio code/);
  seen.add('takedown');
  assert.equal(nextTutorial(world, seen), null, 'one time only');
});

// ---------- Drops from above ----------

// Climbs the room's ladder and stands on its pipe, with the guard parked under it.
function onPipe(roomId, guardId) {
  const room = ROOMS[roomId];
  const [ladder] = room.ladders;
  const [pipe] = room.solids;
  const world = prisonWorld(roomId, ladder.x);
  const guard = guardById(world, guardId);
  for (const other of world.allGuards) if (other !== guard) Object.assign(other, down);
  for (const cam of world.cameras) cam.off = true;
  // He stands a little way along the pipe, facing away from the ladder.
  const post = pipe.x + Math.sign(pipe.x - ladder.x) * 0.8;
  const away = Math.sign(pipe.x - ladder.x);
  Object.assign(guard, { x: post, patrolMin: post, patrolMax: post, facing: away, postFacing: away, turnEvery: 0 });
  return { world, guard, ladder, pipe };
}

test('drops: the Cell Block, the Laundry, and the Mess Hall each have a pipe over a patrol, with a ladder', () => {
  const guards = { 'cell-block': 'cb-guard', laundry: 'la-guard', 'mess-hall': 'mh-guard-1' };
  for (const [roomId, guardId] of Object.entries(guards)) {
    const room = ROOMS[roomId];
    const [pipe] = room.solids;
    const [ladder] = room.ladders;
    const def = room.guards.find((entry) => entry.id === guardId);
    const [from, to] = [Math.min(...def.patrol), Math.max(...def.patrol)];
    assert.ok(pipe.x + pipe.halfWidth > from && pipe.x - pipe.halfWidth < to, `${roomId}: over his beat`);
    assert.equal(ladder.top, pipe.top);
    assert.ok(Math.abs(ladder.x - pipe.x) <= pipe.halfWidth + 0.3, 'the ladder comes up onto it');
    assert.deepEqual(sightBlockers(room), [], 'a pipe is too thin to hide anything');
    // Play it: up the ladder, along the pipe until the marker shows, and down on him.
    const { world, guard } = onPipe(roomId, guardId);
    runUntil(world, () => world.player.climbing === null && world.player.y === pipe.top, { up: true }, 4);
    assert.equal(guard.state, 'calm', 'he does not see you climb behind him, or up there');
    const along = Math.sign(guard.x - world.player.x);
    runUntil(world, () => currentPrompt(world)?.text === 'SPACE: drop on him', { moveX: along, crouch: true }, 4);
    assert.equal(nextTutorial(world, new Set(TUTORIAL.map((h) => h.id).filter((id) => id !== 'drop'))).id, 'drop');
    tap(world, 'action');
    assert.equal(guard.state, 'out', `${roomId}: knocked out from above`);
    assert.equal(world.stats.takedowns.above, 1);
    assert.equal(world.stats.timesSpotted, 0);
  }
});

test('drops: guards and snitches do not see you up on a pipe, and there is a hint at the ladder', () => {
  const { world, pipe } = onPipe('cell-block', 'cb-guard');
  const guard = guardById(world, 'cb-guard');
  Object.assign(guard, { facing: -1, postFacing: -1 });
  Object.assign(world.player, { x: pipe.x, y: pipe.top });
  run(world, { moveX: 1 }, 0.6);
  assert.equal(guard.detection, 0, 'a guard looking straight along under the pipe');
  const snitch = world.snitches.find((entry) => entry.id === 'snitch-1');
  Object.assign(snitch, { facing: -1, lookTimer: 0 });
  world.player.x = 13.2;
  run(world, { moveX: -1 }, 0.4);
  assert.equal(snitch.awareness, 0, 'the snitch beside it watches the floor');
  const fresh = prisonWorld('mess-hall', ROOMS['mess-hall'].ladders[0].x);
  for (const other of fresh.allGuards) Object.assign(other, down);
  const others = new Set(TUTORIAL.map((hint) => hint.id).filter((id) => id !== 'ladder'));
  assert.equal(nextTutorial(fresh, others).id, 'ladder');
});

test('drops: in the Yard, Tower 1\'s platform is over the ground guard\'s beat', () => {
  const world = prisonWorld('yard', 36);
  world.player.y = 5.8;
  for (const cam of world.cameras) cam.off = true;
  Object.assign(guardById(world, 'yd-tower-1'), down);
  const guard = guardById(world, 'yd-guard');
  runUntil(world, () => currentPrompt(world)?.text === 'SPACE: drop on him', {}, 20);
  tap(world, 'action');
  assert.equal(guard.state, 'out');
  assert.equal(world.player.y, 0);
});

test('drops: every bot route still runs clean (see clean-run.test.mjs), and no pipe is in a guard\'s way', () => {
  const world = createWorld();
  for (const guard of world.allGuards) {
    assert.ok(!guard.obstacles.some((block) => block.kind === 'pipe'), `${guard.id} walks under the pipes`);
  }
  assert.ok(Object.values(PRISON.rooms).filter((room) => (room.ladders ?? []).length > 0).length >= 4);
});

// ---------- The ghost marker ----------

test('ghost: the first few carry the label "last seen", and there is a hint the first time', () => {
  const wall = { id: 'w', kind: 'wall', x: 30, halfWidth: 0.5, bottom: 0, top: 4 };
  const world = testWorld({ width: 80, playerX: 24, guards: [sentry('g', 20)], solids: [wall] });
  const guard = world.guards[0];
  const others = new Set(TUTORIAL.map((hint) => hint.id).filter((id) => id !== 'ghost'));
  runUntil(world, () => guard.state === 'alert', {}, 4);
  assert.equal(nextTutorial(world, others), null, 'no hint while he can see you');
  const labels = [];
  for (let round = 0; round < 5; round += 1) {
    world.player.x = 40;
    runUntil(world, () => lastSeenMarkers(world).length === 1, {}, 5);
    if (round === 0) assert.equal(nextTutorial(world, others).id, 'ghost');
    labels.push(lastSeenMarkers(world)[0].label);
    assert.equal(world.lastSeenCount, round + 1);
    // Back into his sight: the ghost goes, and the next one is a new one.
    runUntil(world, () => {
      world.player.x = Math.min(29, guard.x + guard.facing * 2.5);
      return guard.seesPlayer;
    }, {}, 8);
    run(world, {}, 0.05);
    assert.deepEqual(lastSeenMarkers(world), []);
  }
  assert.deepEqual(labels, [true, true, true, false, false]);
});
