// Step 8: the movement test room (?room=gym) and its moves: jump, slide, and dash.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { intentFromGamepad, intentFromKeys } from '../site/js/game/intent.js';
import { GYM, PRISON } from '../site/js/game/rooms.js';
import { guardSeesPlayer } from '../site/js/game/vision.js';
import { createWorld, stepWorld } from '../site/js/game/world.js';
import {
  STEP, eventTypes, guardById, intent, prisonWorld, run, runUntil, tap,
} from './helpers.mjs';

const M = CONFIG.moves;
const gymRoom = GYM.rooms.gym;
const solid = (id) => gymRoom.solids.find((entry) => entry.id === id);
const pit = gymRoom.pits[0];

// The gym with the player standing at x and the guards parked out of the way.
function gym(x = 3) {
  const world = createWorld(GYM);
  world.player.x = x;
  for (const guard of world.allGuards) {
    guard.x = 61;
    guard.patrolMin = 61;
    guard.patrolMax = 61;
    guard.bounds = null;
    guard.facing = 1;
  }
  return world;
}

// Steps until the player is back on the ground, recording the highest point and the time in the air.
function untilLanded(world, keys = {}) {
  let peak = world.player.y;
  const started = world.time;
  runUntil(world, () => {
    peak = Math.max(peak, world.player.y);
    return world.player.onGround && world.time > started;
  }, keys, 5);
  return { peak, seconds: world.time - started };
}

test('gym: a separate practice room, not connected to the prison, with no timer', () => {
  assert.equal(GYM.startRoom, 'gym');
  assert.ok(!('gym' in PRISON.rooms));
  assert.deepEqual(gymRoom.portals, []);
  for (const room of Object.values(PRISON.rooms)) {
    assert.ok((room.portals ?? []).every((portal) => portal.to !== 'gym'));
    assert.ok(!room.moves, 'the main map does not have the new moves');
  }
  const world = gym();
  const before = world.timeLeft;
  run(world, {}, 5);
  assert.equal(world.timeLeft, before);
  assert.equal(world.over, null);
  assert.equal(gymRoom.guards.length, 2);
});

test('gym controls: K and L, controller B and right bumper, and none of them is already in use', () => {
  assert.deepEqual(Object.entries(intentFromKeys(new Set(['KeyK']))).filter(([, on]) => on), [['jump', true]]);
  assert.deepEqual(Object.entries(intentFromKeys(new Set(['KeyL']))).filter(([, on]) => on), [['dash', true]]);
  const pad = (index) => intentFromGamepad({
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === index, value: i === index ? 1 : 0 })),
    axes: [0, 0],
  });
  assert.deepEqual(Object.entries(pad(1)).filter(([, on]) => on), [['jump', true]]);
  assert.deepEqual(Object.entries(pad(5)).filter(([, on]) => on), [['dash', true]]);
});

test('the new moves do nothing in the prison', () => {
  const world = prisonWorld('mess-hall', 19);
  for (const guard of world.allGuards) guard.state = 'out';
  run(world, { jump: true }, 0.2);
  assert.equal(world.player.y, 0);
  const x = world.player.x;
  tap(world, 'dash');
  run(world, {}, 0.3);
  assert.equal(world.player.x, x);
});

test('jump: a fast rise to 1.29 m, a faster fall, and no float', () => {
  const world = gym(3);
  stepWorld(world, intent({ jump: true }), STEP);
  assert.equal(world.player.onGround, false);
  const { peak, seconds } = untilLanded(world, { jump: true });
  const expected = (M.jumpSpeed ** 2) / (2 * M.gravity);
  assert.ok(Math.abs(peak - expected) < 0.05, `peak ${peak}`);
  assert.ok(Math.abs(expected - 1.29) < 0.01);
  assert.ok(seconds < 0.6, `in the air ${seconds} s`);
  assert.ok(M.fallGravity > M.gravity, 'it falls faster than it rises');
  assert.equal(world.player.y, 0);
});

test('jump: letting go early makes a shorter hop', () => {
  const world = gym(3);
  stepWorld(world, intent({ jump: true }), STEP);
  run(world, { jump: true }, 0.05);
  const { peak } = untilLanded(world, {});
  assert.ok(peak < 0.8 && peak > 0.2, `peak ${peak}`);
});

test('jump: holding the button does not jump again on landing', () => {
  const world = gym(3);
  run(world, { jump: true }, 2);
  assert.equal(world.player.onGround, true);
  assert.equal(eventTypes(world).filter((type) => type === 'jump').length, 1);
});

test('jump: landing makes a small noise, smaller than walking', () => {
  const world = gym(3);
  stepWorld(world, intent({ jump: true }), STEP);
  let heard = 0;
  runUntil(world, () => {
    heard = Math.max(heard, ...world.noises.map((noise) => noise.radius));
    return world.player.onGround;
  }, {}, 3);
  stepWorld(world, intent(), STEP);
  heard = Math.max(heard, ...world.noises.map((noise) => noise.radius));
  assert.equal(heard, CONFIG.noise.landRadius);
  assert.ok(CONFIG.noise.landRadius > 0 && CONFIG.noise.landRadius < CONFIG.noise.walkRadius);
  assert.ok(eventTypes(world).includes('land'));
  assert.equal(world.noiseRadius, 0, 'being in the air is silent');
});

test('jump: you can climb the crates and reach the ledge, but not jump straight onto the ledge', () => {
  const world = gym(solid('crate-1').x - 1.4);
  stepWorld(world, intent({ jump: true, moveX: 1 }), STEP);
  untilLanded(world, { jump: true, moveX: 1 });
  assert.equal(world.player.y, solid('crate-1').top);
  stepWorld(world, intent(), STEP);
  stepWorld(world, intent({ jump: true, moveX: 1 }), STEP);
  untilLanded(world, { jump: true, moveX: 1 });
  assert.equal(world.player.y, solid('crate-2').top);
  world.player.x = solid('crate-2').x + solid('crate-2').halfWidth - 0.1;
  stepWorld(world, intent(), STEP);
  stepWorld(world, intent({ jump: true, moveX: 1, run: true }), STEP);
  untilLanded(world, { jump: true, moveX: 1, run: true });
  assert.equal(world.player.y, solid('ledge').top);

  const floor = gym(solid('ledge').x - solid('ledge').halfWidth - 1);
  stepWorld(floor, intent({ jump: true, moveX: 1 }), STEP);
  untilLanded(floor, { jump: true, moveX: 1 });
  assert.equal(floor.player.y, 0);
});

test('a crate stops you walking through it', () => {
  const crate = solid('crate-1');
  const world = gym(crate.x - 3);
  run(world, { moveX: 1, run: true }, 2);
  assert.ok(Math.abs(world.player.x - (crate.x - crate.halfWidth - M.bodyHalfWidth)) < 1e-6);
});

test('dash: a fixed burst of 3.5 m, on the ground', () => {
  const world = gym(44);
  tap(world, 'dash');
  run(world, {}, 1);
  const distance = world.player.x - 44;
  assert.ok(Math.abs(distance - M.dashSpeed * M.dashSeconds) < 0.15, `dashed ${distance}`);
  assert.ok(Math.abs(M.dashSpeed * M.dashSeconds - 3.5) < 1e-9);
  assert.ok(M.dashSpeed > CONFIG.player.runSpeed * 2);
});

test('dash: it goes the way you face, or the way you hold', () => {
  const world = gym(44);
  stepWorld(world, intent({ dash: true, moveX: -1 }), STEP);
  run(world, {}, 1);
  assert.ok(world.player.x < 44 - 3.3);
});

test('dash: in the air it holds its height, and you get one per jump', () => {
  const world = gym(44);
  stepWorld(world, intent({ jump: true }), STEP);
  run(world, { jump: true }, 0.2);
  const height = world.player.y;
  tap(world, 'dash');
  run(world, {}, M.dashSeconds / 2);
  assert.ok(Math.abs(world.player.y - height) < 0.12, 'no drop during the dash');
  run(world, {}, M.dashSeconds);
  const afterFirst = world.player.x;
  assert.ok(afterFirst - 44 > 3.3);
  tap(world, 'dash');
  untilLanded(world);
  assert.ok(world.player.x - afterFirst < 0.01, 'the second air dash does nothing');
  assert.equal(eventTypes(world).filter((type) => type === 'dash').length, 1);
  tap(world, 'dash');
  assert.equal(eventTypes(world).filter((type) => type === 'dash').length, 2, 'landing gives it back');
});

test('dash: it is LOUD, louder than running', () => {
  const world = gym(44);
  tap(world, 'dash');
  assert.equal(world.player.mode, 'dash');
  assert.equal(world.noiseRadius, CONFIG.noise.dashRadius);
  assert.ok(CONFIG.noise.dashRadius > CONFIG.noise.runRadius);
  const heard = gym(44);
  const guard = heard.allGuards[1];
  guard.x = 44 + CONFIG.noise.runRadius + 1.5;
  guard.patrolMin = guard.x;
  guard.patrolMax = guard.x;
  tap(heard, 'dash');
  assert.equal(guard.state, 'suspicious', 'a guard too far away to hear running hears a dash');
});

test('the long gap: a running jump falls short, and a jump with an air dash clears it', () => {
  const width = pit.to - pit.from;
  const short = gym(pit.from - 0.05);
  stepWorld(short, intent({ jump: true, moveX: 1, run: true }), STEP);
  const keys = { jump: true, moveX: 1, run: true };
  runUntil(short, () => eventTypes(short).includes('fell') || short.player.onGround, keys, 5);
  assert.ok(eventTypes(short).includes('fell'), 'a plain running jump ends in the gap');
  assert.ok(short.player.x <= pit.from, 'and you are put back on the near edge');
  assert.equal(short.player.y, 0);

  const far = gym(pit.from - 0.05);
  stepWorld(far, intent({ jump: true, moveX: 1, run: true }), STEP);
  run(far, { jump: true, moveX: 1, run: true }, 0.28);
  stepWorld(far, intent({ jump: true, moveX: 1, run: true, dash: true }), STEP);
  untilLanded(far, { jump: true, moveX: 1, run: true });
  assert.ok(far.player.x > pit.to, `landed at ${far.player.x}`);
  assert.ok(!eventTypes(far).includes('fell'));
  assert.ok(width > CONFIG.player.runSpeed * 0.6, 'wider than any plain jump');
});

test('the long gap: a jump out of a ground dash keeps the dash speed and also clears it', () => {
  const world = gym(pit.from - 1.5);
  stepWorld(world, intent({ dash: true, moveX: 1 }), STEP);
  run(world, { moveX: 1 }, 0.08);
  stepWorld(world, intent({ jump: true, moveX: 1 }), STEP);
  untilLanded(world, { jump: true, moveX: 1 });
  assert.ok(world.player.x > pit.to, `landed at ${world.player.x}`);
});

test('slide: crouch plus jump while moving goes under the low gap, which crouching cannot', () => {
  const gap = solid('low-gap');
  assert.ok(gap.bottom < CONFIG.player.crouchHeight, 'too low to crouch under');
  assert.ok(gap.bottom > M.slideHeight, 'high enough to slide under');
  const nearEdge = gap.x - gap.halfWidth - M.bodyHalfWidth;

  const crouching = gym(nearEdge - 1);
  run(crouching, { moveX: 1, crouch: true }, 4);
  assert.ok(Math.abs(crouching.player.x - nearEdge) < 1e-6, 'crouch-walking is stopped by it');

  const sliding = gym(nearEdge - 0.3);
  stepWorld(sliding, intent({ moveX: 1, crouch: true }), STEP);
  stepWorld(sliding, intent({ moveX: 1, crouch: true, jump: true }), STEP);
  assert.equal(sliding.player.sliding, true);
  assert.equal(sliding.player.mode, 'slide');
  run(sliding, { moveX: 1, crouch: true }, 1.5);
  assert.ok(sliding.player.x > gap.x + gap.halfWidth, `slid to ${sliding.player.x}`);
  assert.equal(sliding.player.sliding, false);
  assert.equal(sliding.player.y, 0);
});

test('slide: a slide that would end under the gap keeps going until there is room to get up', () => {
  const gap = solid('low-gap');
  const world = gym(gap.x - gap.halfWidth - 2.6);
  stepWorld(world, intent({ moveX: 1, crouch: true }), STEP);
  stepWorld(world, intent({ moveX: 1, crouch: true, jump: true }), STEP);
  run(world, {}, M.slideSeconds + 0.02);
  assert.equal(world.player.sliding, true, 'still under the gap');
  run(world, {}, 1);
  assert.equal(world.player.sliding, false);
  assert.ok(world.player.x >= gap.x + gap.halfWidth + M.bodyHalfWidth - 1e-6);
});

test('slide: quiet, and standing still with crouch plus jump is a normal jump', () => {
  const world = gym(44);
  stepWorld(world, intent({ moveX: 1, crouch: true }), STEP);
  stepWorld(world, intent({ moveX: 1, crouch: true, jump: true }), STEP);
  assert.equal(world.noiseRadius, CONFIG.noise.slideRadius);
  assert.ok(CONFIG.noise.slideRadius < CONFIG.noise.walkRadius);
  run(world, {}, M.slideSeconds + 0.1);
  const distance = world.player.x - 44;
  assert.ok(Math.abs(distance - M.slideSpeed * M.slideSeconds) < 0.2, `slid ${distance}`);

  const still = gym(44);
  stepWorld(still, intent({ crouch: true }), STEP);
  stepWorld(still, intent({ crouch: true, jump: true }), STEP);
  assert.equal(still.player.sliding, false);
  assert.equal(still.player.onGround, false);
});

test('sneaking: up on the ledge you are above a flashlight that would see you on the floor', () => {
  const world = gym(15);
  const guard = { x: 10.5, facing: 1 };
  assert.equal(guardSeesPlayer(guard, world.player), true);
  world.player.y = solid('ledge').top;
  assert.equal(guardSeesPlayer(guard, world.player), false);
});

test('gym guards stay on their own stretch of floor, and cannot grab you off the ledge', () => {
  const world = createWorld(GYM);
  const guard = guardById(world, 'gym-guard-1');
  world.player.x = 30;
  guard.state = 'alert';
  guard.lastKnownX = 30;
  guard.trackTimer = 3;
  run(world, {}, 3);
  assert.ok(guard.x <= gymRoom.guards[0].bounds[1] + 1e-9);

  const high = createWorld(GYM);
  const chaser = guardById(high, 'gym-guard-1');
  high.player.x = 15;
  high.player.y = solid('ledge').top;
  chaser.x = 15;
  chaser.state = 'alert';
  chaser.lastKnownX = 15;
  chaser.trackTimer = 1;
  run(high, {}, 0.5);
  assert.equal(high.grab, null);
  assert.equal(high.over, null);
});
