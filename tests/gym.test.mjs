// The gym (?room=gym): an obstacle course for jump, slide, and dash, with precision-platformer feel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { intentFromGamepad, intentFromKeys } from '../site/js/game/intent.js';
import { GYM, PRISON } from '../site/js/game/rooms.js';
import { SLIDERS, movesFromSliders, slidersFromMoves, tuningText } from '../site/js/game/tuning.js';
import { guardSeesPlayer } from '../site/js/game/vision.js';
import { createWorld, stepWorld } from '../site/js/game/world.js';
import {
  STEP, eventTypes, guardById, intent, prisonWorld, run, runUntil, tap,
} from './helpers.mjs';

const M = CONFIG.moves;
const gymRoom = GYM.rooms.gym;
const solid = (id) => gymRoom.solids.find((entry) => entry.id === id);
const pit = (id) => gymRoom.pits.find((entry) => entry.id === id);
// A clear stretch of floor with nothing to bump into.
const OPEN = 44.5;
const count = (world, type) => eventTypes(world).filter((entry) => entry === type).length;

// The gym with the player standing at x and the guard parked at the far end. cfg changes
// movement numbers for one test.
function gym(x = 3) {
  const world = createWorld(GYM);
  world.player.x = x;
  for (const guard of world.allGuards) {
    Object.assign(guard, { x: 83, patrolMin: 83, patrolMax: 83, bounds: null, facing: 1, radioAt: null });
  }
  return world;
}

// The same room with the crates and gaps taken out, for measuring a move on open floor.
function flat(x = 10) {
  const room = { ...gymRoom, solids: [], pits: [], guards: [], hideSpots: [] };
  const world = createWorld({ startRoom: 'gym', practice: true, rooms: { gym: room } });
  world.player.x = x;
  return world;
}

const step = (world, keys = {}, cfg = CONFIG) => stepWorld(world, intent(keys), STEP, cfg);
// A quick tap of jump, about as short as a person can press a key.
const TAP = 0.06;
function tapJump(world, keys = {}) {
  step(world, { ...keys, jump: true });
  run(world, { ...keys, jump: true }, TAP);
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

// ---------- The room ----------

test('gym: a separate practice room, not connected to the prison, with no headcount', () => {
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
});

test('gym: an obstacle course, left to right, with a sign over each part and a finish line', () => {
  // Signs marked extra are notes along the way (where the cup is), not parts of the course.
  const signs = gymRoom.signs.filter((sign) => !sign.extra);
  assert.deepEqual(signs.map((sign) => sign.text), [
    '1. JUMP (K / B)', '2. HOLD JUMP TO GO HIGHER', '3. SLIDE (crouch + jump)', '4. DASH (L / RB)',
    '5. AIR DASH', '6. SNEAK PAST THE GUARD', 'FINISH',
  ]);
  const xs = signs.map((sign) => sign.x);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'in order');
  const parts = [solid('hop').x, solid('high').x, solid('low-gap').x, pit('dash-gap').from, pit('air-gap').from,
    gymRoom.guards[0].patrol[0], gymRoom.finish.x];
  assert.deepEqual(parts, [...parts].sort((a, b) => a - b), 'the obstacles come in the same order');
  parts.forEach((x, i) => assert.ok(Math.abs(x - xs[i]) < 3, `sign ${i + 1} is over its obstacle`));
});

test('gym: the course clock starts when you move, stops at the finish line, and says the time', () => {
  const world = gym();
  run(world, {}, 1);
  assert.equal(world.course.startedAt, null, 'not until you move');
  run(world, { moveX: 1 }, 2);
  assert.ok(Math.abs(world.course.seconds - 2) < 0.05);
  world.player.x = gymRoom.finish.x - 0.2;
  run(world, { moveX: 1 }, 0.5);
  assert.notEqual(world.course.finishedAt, null);
  const { seconds } = world.course;
  assert.equal(count(world, 'finish'), 1);
  assert.match(world.message.text, new RegExp(`Finished in ${seconds.toFixed(2)} s`));
  run(world, { moveX: -1 }, 1);
  assert.equal(world.course.seconds, seconds, 'the clock has stopped');
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

test('the new moves do nothing in the prison, and running there is unchanged', () => {
  const world = prisonWorld('mess-hall', 19);
  for (const guard of world.allGuards) guard.state = 'out';
  run(world, { jump: true }, 0.2);
  assert.equal(world.player.y, 0);
  const x = world.player.x;
  tap(world, 'dash');
  run(world, {}, 0.3);
  assert.equal(world.player.x, x);
  run(world, { moveX: 1, run: true }, 1);
  assert.ok(Math.abs(world.player.x - x - CONFIG.player.runSpeed) < 0.06);
});

// ---------- Ground feel ----------

test('ground: instant start and stop, no sliding', () => {
  const world = gym(OPEN);
  step(world, { moveX: 1, run: true });
  assert.equal(world.player.speed, CONFIG.player.runSpeed, 'full speed on the first step');
  run(world, { moveX: 1, run: true }, 0.5);
  const x = world.player.x;
  step(world);
  assert.equal(world.player.x, x, 'and a dead stop');
  step(world, { moveX: -1, run: true });
  assert.ok(world.player.x < x, 'turning round is instant too');
});

// ---------- Jump ----------

test('jump: hold for the full 1.5 m, with a fast rise and a faster fall', () => {
  const world = gym(OPEN);
  step(world, { jump: true });
  assert.equal(world.player.onGround, false);
  const { peak, seconds } = untilLanded(world, { jump: true });
  const expected = (M.jumpSpeed ** 2) / (2 * M.gravity);
  assert.ok(Math.abs(peak - expected) < 0.05, `peak ${peak}`);
  assert.ok(Math.abs(expected - 1.5) < 0.01);
  assert.ok(seconds < 0.7, `in the air ${seconds} s`);
  assert.ok(M.fallGravity > M.gravity, 'falling is faster than rising');
});

test('jump: variable height. A tap is a short hop, and letting go cuts the upward speed', () => {
  const tapped = gym(OPEN);
  tapJump(tapped);
  const hop = untilLanded(tapped, {}).peak;
  const half = gym(OPEN);
  step(half, { jump: true });
  run(half, { jump: true }, 0.12);
  const speedBefore = half.player.vy;
  step(half);
  assert.ok(speedBefore > M.jumpCutSpeed);
  assert.ok(half.player.vy <= M.jumpCutSpeed, 'the release cuts the rise');
  const middle = untilLanded(half, {}).peak;
  const full = (M.jumpSpeed ** 2) / (2 * M.gravity);
  assert.ok(hop < 0.75, `tap ${hop}`);
  assert.ok(hop < middle && middle < full - 0.1, `${hop} < ${middle} < ${full}`);
  assert.ok(hop > solid('hop').top, 'a tap is enough for the first crate');
});

test('jump: holding down in the air drops faster', () => {
  const normal = gym(OPEN);
  step(normal, { jump: true });
  const slow = untilLanded(normal, { jump: true }).seconds;
  const dropping = gym(OPEN);
  step(dropping, { jump: true });
  run(dropping, { jump: true }, M.jumpSpeed / M.gravity);
  const fast = M.jumpSpeed / M.gravity + untilLanded(dropping, { crouch: true }).seconds;
  assert.ok(fast < slow - 0.03, `${fast} against ${slow}`);
});

test('jump: full air control. You can turn round in mid-air at once', () => {
  const world = gym(OPEN);
  step(world, { jump: true, moveX: 1, run: true });
  run(world, { jump: true, moveX: 1, run: true }, 0.15);
  const x = world.player.x;
  step(world, { jump: true, moveX: -1, run: true });
  assert.ok(Math.abs(x - world.player.x - CONFIG.player.runSpeed * STEP) < 1e-9);
  step(world, { jump: true });
  assert.equal(world.player.speed, 0);
});

test('jump: coyote time. For 0.1 s after walking off an edge you can still jump', () => {
  assert.equal(M.coyoteSeconds, 0.1);
  const edge = solid('high').x + solid('high').halfWidth + M.bodyHalfWidth;
  const offTheEdge = (wait) => {
    const world = gym(edge - 0.02);
    world.player.y = solid('high').top;
    run(world, { moveX: 1 }, 0.02);
    assert.equal(world.player.onGround, false, 'walked off');
    run(world, { moveX: 1 }, wait);
    step(world, { moveX: 1, jump: true });
    return world;
  };
  const inTime = offTheEdge(M.coyoteSeconds - 0.04);
  assert.ok(inTime.player.vy > 0, 'the jump happens');
  assert.equal(count(inTime, 'jump'), 1);
  const tooLate = offTheEdge(M.coyoteSeconds + 0.04);
  assert.ok(tooLate.player.vy < 0, 'too late: still falling');
  assert.equal(count(tooLate, 'jump'), 0);
});

test('jump: coyote time does not give a second jump in mid-air', () => {
  const world = gym(OPEN);
  step(world, { jump: true });
  step(world);
  step(world, { jump: true });
  assert.equal(count(world, 'jump'), 1);
});

test('jump: buffering. A press 0.1 s before landing still jumps on landing', () => {
  assert.equal(M.jumpBufferSeconds, 0.1);
  const pressBeforeLanding = (lead) => {
    const world = gym(OPEN);
    step(world, { jump: true });
    const { seconds } = untilLanded(structuredClone(world), { jump: true });
    run(world, { jump: true }, seconds - lead);
    step(world);
    assert.equal(world.player.onGround, false, 'still in the air');
    step(world, { jump: true });
    run(world, { jump: true }, lead + 0.05);
    return count(world, 'jump');
  };
  assert.equal(pressBeforeLanding(M.jumpBufferSeconds - 0.03), 2, 'buffered');
  assert.equal(pressBeforeLanding(M.jumpBufferSeconds + 0.06), 1, 'pressed too early');
});

test('jump: holding the button does not jump again on landing', () => {
  const world = gym(OPEN);
  run(world, { jump: true }, 2);
  assert.equal(world.player.onGround, true);
  assert.equal(count(world, 'jump'), 1);
});

test('jump: landing makes a small noise, smaller than walking', () => {
  const world = gym(OPEN);
  step(world, { jump: true });
  let heard = 0;
  runUntil(world, () => {
    heard = Math.max(heard, ...world.noises.map((noise) => noise.radius));
    return world.player.onGround;
  }, {}, 3);
  step(world);
  heard = Math.max(heard, ...world.noises.map((noise) => noise.radius));
  assert.equal(heard, CONFIG.noise.landRadius);
  assert.ok(CONFIG.noise.landRadius > 0 && CONFIG.noise.landRadius < CONFIG.noise.walkRadius);
  assert.equal(world.noiseRadius, 0, 'being in the air is silent');
});

test('course parts 1 and 2: a tap clears the low crate, and the tall crate needs the full jump', () => {
  const low = solid('hop');
  const hopper = gym(low.x - low.halfWidth - 0.9);
  tapJump(hopper, { moveX: 1 });
  untilLanded(hopper, { moveX: 1 });
  const over = hopper.player.x > low.x + low.halfWidth;
  assert.ok(hopper.player.y === low.top || over, `onto it or over it: ${hopper.player.x}`);

  const tall = solid('high');
  const tapper = gym(tall.x - tall.halfWidth - 0.9);
  tapJump(tapper, { moveX: 1 });
  untilLanded(tapper, { moveX: 1 });
  assert.equal(tapper.player.y, 0, 'a tap is not enough');
  const holder = gym(tall.x - tall.halfWidth - 0.9);
  step(holder, { jump: true, moveX: 1 });
  untilLanded(holder, { jump: true, moveX: 1 });
  assert.equal(holder.player.y, tall.top, 'holding gets you up');
});

// ---------- Dash ----------

test('dash: a fixed distance at a fixed speed, with no slowdown at the end', () => {
  const world = gym(OPEN);
  tap(world, 'dash');
  const speeds = [];
  while (world.player.dashTime > 0) {
    step(world);
    speeds.push(world.player.speed);
  }
  assert.ok(speeds.every((speed) => speed === M.dashSpeed), 'the same speed on every step of it');
  run(world, {}, 0.5);
  const distance = world.player.x - OPEN;
  assert.ok(Math.abs(distance - M.dashSpeed * M.dashSeconds) < 0.15, `dashed ${distance}`);
  assert.ok(Math.abs(M.dashSpeed * M.dashSeconds - 4.5) < 1e-9);
  assert.equal(world.player.speed, 0, 'and a dead stop after');
});

test('dash: it goes the way you hold, or the way you face', () => {
  const world = gym(OPEN + 4);
  step(world, { dash: true, moveX: -1 });
  run(world, {}, 1);
  assert.ok(world.player.x < OPEN + 4 - 3.3);
});

test('air dash: once per jump, in a straight line, with no gravity during it', () => {
  const world = gym(OPEN);
  step(world, { jump: true });
  run(world, { jump: true }, 0.2);
  const height = world.player.y;
  tap(world, 'dash');
  const heights = [];
  while (world.player.dashTime > 0) {
    step(world);
    heights.push(world.player.y);
  }
  assert.ok(heights.every((y) => y === heights[0]), 'dead level for the whole dash');
  assert.ok(Math.abs(heights[0] - height) < 0.12);
  const afterFirst = world.player.x;
  assert.ok(afterFirst - OPEN > 3.3);
  tap(world, 'dash');
  untilLanded(world);
  assert.ok(world.player.x - afterFirst < 0.01, 'the second air dash does nothing');
  assert.equal(count(world, 'dash'), 1);
  tap(world, 'dash');
  assert.equal(count(world, 'dash'), 2, 'landing gives it back');
});

test('dash jump: jump out of a ground dash and the dash speed lasts the whole jump', () => {
  const world = flat(OPEN);
  step(world, { dash: true, moveX: 1 });
  run(world, { moveX: 1 }, 0.05);
  step(world, { jump: true, moveX: 1 });
  run(world, { jump: true, moveX: 1 }, 0.3);
  assert.equal(world.player.onGround, false);
  assert.equal(world.player.speed, M.dashSpeed, 'still at dash speed, long after the dash itself would have ended');
  untilLanded(world, { jump: true, moveX: 1 });
  assert.ok(world.player.x - OPEN > 7, `went ${world.player.x - OPEN} m`);
});

test('dash jump: holding dash while jumping off the ground does the same, with no dash first', () => {
  const world = flat(OPEN);
  step(world, { dash: true, moveX: 1 });
  run(world, { dash: true, moveX: 1 }, 0.6);
  const from = world.player.x;
  assert.ok(world.player.dashTime <= 0, 'the dash is over, the button is still down');
  step(world, { dash: true, jump: true, moveX: 1 });
  run(world, { dash: true, jump: true, moveX: 1 }, 0.3);
  assert.equal(world.player.speed, M.dashSpeed);
  untilLanded(world, { dash: true, jump: true, moveX: 1 });
  assert.ok(world.player.x - from > 7);
  const plain = flat(OPEN);
  step(plain, { jump: true, moveX: 1, run: true });
  untilLanded(plain, { jump: true, moveX: 1, run: true });
  assert.ok(plain.player.x - OPEN < 4.6, 'a plain running jump goes about half as far');
});

test('dash jump: letting go of the direction drops back to normal air speed', () => {
  const world = gym(OPEN);
  step(world, { dash: true, moveX: 1 });
  step(world, { jump: true, moveX: 1 });
  run(world, { jump: true, moveX: 1 }, 0.1);
  step(world, { jump: true });
  step(world, { jump: true, moveX: 1 });
  assert.equal(world.player.speed, CONFIG.player.walkSpeed);
});

test('dash: it is LOUD, louder than running', () => {
  const world = gym(OPEN);
  tap(world, 'dash');
  assert.equal(world.noiseRadius, CONFIG.noise.dashRadius);
  assert.ok(CONFIG.noise.dashRadius > CONFIG.noise.runRadius);
  const heard = gym(OPEN);
  const guard = heard.allGuards[0];
  Object.assign(guard, { x: OPEN + CONFIG.noise.runRadius + 1.5 });
  guard.patrolMin = guard.x;
  guard.patrolMax = guard.x;
  tap(heard, 'dash');
  assert.equal(guard.state, 'suspicious', 'a guard too far away to hear running hears a dash');
});

test('course parts 4 and 5: both gaps beat a running jump. A dash jump clears 4, jump then air dash clears 5', () => {
  for (const gap of [pit('dash-gap'), pit('air-gap')]) {
    const short = gym(gap.from - 0.05);
    const keys = { jump: true, moveX: 1, run: true };
    step(short, keys);
    runUntil(short, () => eventTypes(short).includes('fell') || short.player.onGround, keys, 5);
    assert.ok(eventTypes(short).includes('fell'), `${gap.id}: a plain running jump ends in the gap`);
    assert.ok(short.player.x <= gap.from && short.player.y === 0, 'and you are put back on the near edge');
  }
  const dashJump = gym(pit('dash-gap').from - 0.3);
  step(dashJump, { dash: true, moveX: 1 });
  step(dashJump, { dash: true, jump: true, moveX: 1 });
  untilLanded(dashJump, { dash: true, jump: true, moveX: 1 });
  assert.ok(dashJump.player.x > pit('dash-gap').to && !eventTypes(dashJump).includes('fell'));

  const airDash = gym(pit('air-gap').from - 0.05);
  step(airDash, { jump: true, moveX: 1, run: true });
  run(airDash, { jump: true, moveX: 1, run: true }, 0.28);
  step(airDash, { jump: true, moveX: 1, run: true, dash: true });
  untilLanded(airDash, { jump: true, moveX: 1, run: true });
  assert.ok(airDash.player.x > pit('air-gap').to, `landed at ${airDash.player.x}`);
  assert.ok(!eventTypes(airDash).includes('fell'));
});

// ---------- Slide ----------

test('course part 3: a slide goes under the low gap, which crouching cannot', () => {
  const gap = solid('low-gap');
  assert.ok(gap.bottom < CONFIG.player.crouchHeight, 'too low to crouch under');
  assert.ok(gap.bottom > M.slideHeight, 'high enough to slide under');
  const nearEdge = gap.x - gap.halfWidth - M.bodyHalfWidth;

  const crouching = gym(nearEdge - 1);
  run(crouching, { moveX: 1, crouch: true }, 4);
  assert.ok(Math.abs(crouching.player.x - nearEdge) < 1e-6, 'crouch-walking is stopped by it');

  const sliding = gym(nearEdge - 0.3);
  step(sliding, { moveX: 1, crouch: true });
  step(sliding, { moveX: 1, crouch: true, jump: true });
  assert.equal(sliding.player.sliding, true);
  run(sliding, { moveX: 1, crouch: true }, 1.5);
  assert.ok(sliding.player.x > gap.x + gap.halfWidth, `slid to ${sliding.player.x}`);
  assert.equal(sliding.player.sliding, false);
});

test('slide: one that would end under the gap keeps going until there is room to get up', () => {
  const gap = solid('low-gap');
  const world = gym(gap.x - gap.halfWidth - 2.6);
  step(world, { moveX: 1, crouch: true });
  step(world, { moveX: 1, crouch: true, jump: true });
  run(world, {}, M.slideSeconds + 0.02);
  assert.equal(world.player.sliding, true, 'still under the gap');
  run(world, {}, 1);
  assert.equal(world.player.sliding, false);
  assert.ok(world.player.x >= gap.x + gap.halfWidth + M.bodyHalfWidth - 1e-6);
});

test('slide: quiet, a fixed 3.15 m, and crouch plus jump standing still is a normal jump', () => {
  const world = gym(OPEN);
  step(world, { moveX: 1, crouch: true });
  step(world, { moveX: 1, crouch: true, jump: true });
  assert.equal(world.noiseRadius, CONFIG.noise.slideRadius);
  assert.ok(CONFIG.noise.slideRadius < CONFIG.noise.walkRadius);
  run(world, {}, M.slideSeconds + 0.1);
  const distance = world.player.x - OPEN;
  assert.ok(Math.abs(distance - M.slideSpeed * M.slideSeconds) < 0.2, `slid ${distance}`);

  const still = gym(OPEN);
  step(still, { crouch: true });
  step(still, { crouch: true, jump: true });
  assert.equal(still.player.sliding, false);
  assert.equal(still.player.onGround, false);
});

// ---------- Sneaking ----------

test('course part 6: the crates lead up to the ledge, and up there you are above his flashlight', () => {
  const world = gym(solid('step-1').x - 1.3);
  for (const id of ['step-1', 'step-2']) {
    step(world);
    step(world, { jump: true, moveX: 1 });
    untilLanded(world, { jump: true, moveX: 1 });
    assert.equal(world.player.y, solid(id).top, id);
  }
  world.player.x = solid('step-2').x + solid('step-2').halfWidth - 0.1;
  step(world);
  step(world, { jump: true, moveX: 1, run: true });
  untilLanded(world, { jump: true, moveX: 1, run: true });
  assert.equal(world.player.y, solid('ledge').top);

  const guard = { x: world.player.x - 4.5, facing: 1 };
  assert.equal(guardSeesPlayer(guard, { ...world.player, y: 0 }), true, 'on the floor he would see you');
  assert.equal(guardSeesPlayer(guard, world.player), false);
});

test('the gym guard stays on his own stretch of floor, and cannot grab you off the ledge', () => {
  const world = createWorld(GYM);
  const guard = guardById(world, 'gym-guard');
  Object.assign(guard, { state: 'alert', lastKnownX: 40, trackTimer: 3 });
  world.player.x = 40;
  run(world, {}, 3);
  assert.ok(guard.x >= gymRoom.guards[0].bounds[0] - 1e-9);

  const high = createWorld(GYM);
  const chaser = guardById(high, 'gym-guard');
  Object.assign(high.player, { x: 68, y: solid('ledge').top });
  Object.assign(chaser, { x: 68, state: 'alert', lastKnownX: 68, trackTimer: 1 });
  run(high, {}, 1.5);
  assert.equal(high.grab, null);
  assert.equal(high.over, null);
});

// ---------- Tuning sliders ----------

test('tuning: the five sliders are jump height, gravity, fall speed, dash speed, and dash distance', () => {
  assert.deepEqual(SLIDERS.map((slider) => slider.id), [
    'jumpHeight', 'gravity', 'fallGravity', 'dashSpeed', 'dashDistance',
  ]);
  const start = slidersFromMoves(CONFIG.moves);
  assert.deepEqual(start, { jumpHeight: 1.5, gravity: 19, fallGravity: 40, dashSpeed: 12.5, dashDistance: 4.5 });
  for (const slider of SLIDERS) {
    assert.ok(start[slider.id] > slider.min && start[slider.id] < slider.max, `${slider.id} has room both ways`);
  }
});

test('tuning: moving a slider changes the move in the game at once', () => {
  const moves = movesFromSliders({ ...slidersFromMoves(), jumpHeight: 2.2, gravity: 50, dashDistance: 6 });
  const cfg = { ...CONFIG, moves };
  const world = flat(OPEN);
  step(world, { jump: true }, cfg);
  let peak = 0;
  while (!world.player.onGround) {
    step(world, { jump: true }, cfg);
    peak = Math.max(peak, world.player.y);
  }
  assert.ok(Math.abs(peak - 2.2) < 0.1, `jumped ${peak}`);
  const from = world.player.x;
  step(world, {}, cfg);
  step(world, { dash: true }, cfg);
  for (let i = 0; i < 120; i += 1) step(world, {}, cfg);
  assert.ok(Math.abs(world.player.x - from - 6) < 0.2, `dashed ${world.player.x - from}`);
  assert.equal(moves.slideSpeed, CONFIG.moves.slideSpeed, 'numbers without a slider are left alone');
});

test('tuning: the values come out as text ready to paste into config.js', () => {
  const text = tuningText(movesFromSliders({ ...slidersFromMoves(), dashSpeed: 16, dashDistance: 4 }));
  assert.match(text, /dashSpeed: 16,/);
  assert.match(text, /dashSeconds: 0\.25,/);
  assert.match(text, /jumpSpeed: \d/);
  assert.match(text, /Jump height 1\.5 m, dash distance 4 m/);
});
