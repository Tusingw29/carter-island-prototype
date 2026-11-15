// Step 11: the Yard. Ledges and ladders, jump and slide in the main game, the dash unlock,
// fences, searchlights, the tower guards, the roof route and the window, the basketball, the map.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cameraLit, cameraSeesPlayer, cameraSweep, createCamera, poolSlices,
} from '../site/js/game/camera.js';
import { CONFIG } from '../site/js/game/config.js';
import { createFraming, goalLift, updateFraming } from '../site/js/game/framing.js';
import { mapModel } from '../site/js/game/map.js';
import { currentMessage } from '../site/js/game/messages.js';
import { canDash, climbables } from '../site/js/game/moves.js';
import { findPortal } from '../site/js/game/portals.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { GYM, PRISON, ROOMS } from '../site/js/game/rooms.js';
import { sightBlockers } from '../site/js/game/sight.js';
import { THROWABLES } from '../site/js/game/throwing.js';
import { guardSeesPlayer } from '../site/js/game/vision.js';
import { createWorld, stepWorld } from '../site/js/game/world.js';
import {
  STEP, eventTypes, guardById, intent, prisonWorld, run, runUntil, tap, testWorld,
} from './helpers.mjs';

const M = CONFIG.moves;
const yard = ROOMS.yard;
const solid = (id) => yard.solids.find((entry) => entry.id === id);
const happened = (world, type) => eventTypes(world).includes(type);
const step = (world, keys = {}) => stepWorld(world, intent(keys), STEP);
const light = (world, id) => world.cameras.find((camera) => camera.id === id);

// The Yard with the player at (x, y). quiet: true knocks out the guards and turns off the
// lights, for tests that are only about moving around.
function inYard(x, y = 0, quiet = true) {
  const world = prisonWorld('yard', x);
  world.player.y = y;
  if (quiet) {
    for (const guard of world.guards) Object.assign(guard, { state: 'out', outFor: -1e6, radioAt: null });
    for (const camera of world.cameras) camera.off = true;
  }
  return world;
}

// A full jump toward x, steering in the air. Returns once the player has landed.
function leap(world, x, keys = {}) {
  const dir = Math.sign(x - world.player.x) || 1;
  step(world, { ...keys, jump: true, moveX: dir });
  for (let i = 0; i < 4 / STEP && !world.player.onGround; i += 1) {
    step(world, { ...keys, jump: true, moveX: (x - world.player.x) * dir > 0.03 ? dir : 0 });
  }
  step(world);
}

function walk(world, x, keys = {}) {
  const dir = Math.sign(x - world.player.x);
  runUntil(world, () => (x - world.player.x) * dir <= 0.03, { ...keys, moveX: dir }, 30);
  step(world, keys);
}

// A plain room with whatever ledges and ladders a test needs.
const plain = (extra) => testWorld({ width: 60, playerX: 20, ...extra });
const ledge = (from, to, top) => ({
  id: `ledge-${from}`, kind: 'ledge', x: (from + to) / 2, halfWidth: (to - from) / 2, bottom: top - 0.25, top,
  through: true,
});

// ---------- Ledges and ladders ----------

test('ledges: you can jump up through one and stand on it', () => {
  const world = plain({ solids: [ledge(18, 22, 1.2)] });
  step(world, { jump: true });
  let peak = 0;
  runUntil(world, () => {
    peak = Math.max(peak, world.player.y);
    return world.player.onGround;
  }, { jump: true }, 3);
  assert.ok(peak > 1.4, 'the ledge did not stop the jump from below');
  assert.equal(world.player.y, 1.2, 'and you come down onto it');
  run(world, { moveX: 1 }, 0.3);
  assert.equal(world.player.y, 1.2, 'you can walk along it');
  run(world, { moveX: 1 }, 1);
  assert.equal(world.player.y, 0, 'and off the end of it');
});

test('ledges: you can walk under one, and crouch plus jump standing still drops you through it', () => {
  const world = plain({ playerX: 15, solids: [ledge(18, 22, 1.2)] });
  run(world, { moveX: 1 }, 2);
  assert.ok(world.player.x > 20, 'walked straight under it');
  const up = plain({ solids: [ledge(18, 22, 1.2)] });
  up.player.y = 1.2;
  step(up, { crouch: true, jump: true });
  runUntil(up, () => up.player.onGround && up.player.y === 0, {}, 2);
  // On plain floor the same buttons are still an ordinary jump.
  const floor = plain();
  step(floor, { crouch: true, jump: true });
  run(floor, { crouch: true, jump: true }, 0.1);
  assert.ok(floor.player.y > 0.3);
});

test('ladders: hold Up to climb, and you step off at the top', () => {
  const world = plain({ solids: [ledge(19, 25, 4)], ladders: [{ id: 'l', x: 20.2, bottom: 0, top: 4 }] });
  run(world, { up: true }, 0.5);
  assert.notEqual(world.player.climbing, null);
  assert.equal(world.player.x, 20.2, 'you are pulled onto the ladder');
  assert.ok(Math.abs(world.player.y - 0.5 * M.ladderClimbSpeed) < 0.05, 'at the ladder climbing speed');
  assert.equal(world.player.mode, 'climb');
  assert.equal(world.noiseRadius, 0, 'climbing is silent');
  // Let go of Up and you stay where you are.
  const heldAt = world.player.y;
  run(world, {}, 0.5);
  assert.equal(world.player.y, heldAt);
  runUntil(world, () => world.player.climbing === null, { up: true }, 5);
  assert.equal(world.player.y, 4);
  assert.equal(world.player.onGround, true, 'standing on the ledge at the top');
});

test('ladders: hold Down at the top to climb down, and Jump lets go', () => {
  const world = plain({ solids: [ledge(19, 25, 4)], ladders: [{ id: 'l', x: 20.2, bottom: 0, top: 4 }] });
  Object.assign(world.player, { x: 20.2, y: 4 });
  run(world, { crouch: true }, 0.5);
  assert.notEqual(world.player.climbing, null);
  assert.ok(world.player.y < 3.2);
  runUntil(world, () => world.player.climbing === null && world.player.onGround, { crouch: true }, 5);
  assert.equal(world.player.y, 0);
  // Jump lets go half way up, and you fall.
  run(world, { up: true }, 0.8);
  assert.ok(world.player.y > 1.5);
  tap(world, 'jump');
  assert.equal(world.player.climbing, null);
  runUntil(world, () => world.player.onGround, {}, 3);
  assert.equal(world.player.y, 0);
});

test('ladders: crouch-walking along a platform past the top of its ladder does not grab it', () => {
  const world = plain({ solids: [ledge(19, 25, 4)], ladders: [{ id: 'l', x: 24.5, bottom: 0, top: 4 }] });
  Object.assign(world.player, { x: 24.5, y: 4 });
  run(world, { crouch: true, moveX: -1 }, 1);
  assert.equal(world.player.climbing, null);
  assert.equal(world.player.y, 4);
  assert.ok(Math.abs(world.player.x - (24.5 - CONFIG.player.crouchSpeed)) < 0.05);
});

test('ladders and doors: Up opens the door when both are in reach', () => {
  const door = { id: 'a', type: 'door', x: 20, to: 'test', toPortal: 'a' };
  const world = plain({ portals: [door], ladders: [{ id: 'l', x: 20.2, bottom: 0, top: 4 }] });
  run(world, { up: true }, 0.3);
  assert.equal(world.player.climbing, null, 'the door takes Up, not the ladder');
});

// ---------- Movement in the main game ----------

test('main game: jump and slide are there from the start of every run', () => {
  for (const roomId of ['cell-block', 'mess-hall', 'laundry', 'yard']) {
    const world = prisonWorld(roomId, 12);
    for (const guard of world.allGuards) Object.assign(guard, { state: 'out', radioAt: null });
    for (const camera of world.cameras) camera.off = true;
    step(world, { jump: true });
    let peak = 0;
    runUntil(world, () => {
      peak = Math.max(peak, world.player.y);
      return world.player.onGround;
    }, { jump: true }, 3);
    assert.ok(Math.abs(peak - 1.5) < 0.06, `${roomId}: a 1.5 m jump, the gym value (${peak})`);
  }
  const world = prisonWorld('cell-block', 12);
  for (const guard of world.allGuards) guard.state = 'out';
  step(world, { moveX: 1 });
  step(world, { moveX: 1, crouch: true, jump: true });
  assert.equal(world.player.sliding, true);
  assert.equal(world.player.mode, 'slide');
});

test('main game: no jumping in the duct, which is too low to stand in', () => {
  const world = prisonWorld('vent-duct', 10);
  run(world, { jump: true }, 0.3);
  assert.equal(world.player.y, 0);
});

test('main game: walking and running are exactly as they were', () => {
  for (const [keys, speed] of [[{}, CONFIG.player.walkSpeed], [{ run: true }, CONFIG.player.runSpeed],
    [{ crouch: true }, CONFIG.player.crouchSpeed]]) {
    const world = prisonWorld('mess-hall', 10);
    for (const guard of world.allGuards) guard.state = 'out';
    step(world, { ...keys, moveX: 1 });
    assert.equal(world.player.speed, speed, 'full speed on the first step');
    run(world, { ...keys, moveX: 1 }, 1);
    assert.ok(Math.abs(world.player.x - 10 - speed) < 0.06);
    const stoppedAt = world.player.x;
    step(world);
    assert.equal(world.player.x, stoppedAt, 'and a dead stop');
  }
  assert.equal(CONFIG.player.walkSpeed, 3.2);
  assert.equal(CONFIG.player.runSpeed, 6.5);
});

test('dash: locked until the work boots are picked up', () => {
  const world = inYard(20);
  assert.equal(canDash(world), false);
  tap(world, 'dash');
  run(world, {}, 0.4);
  assert.equal(world.player.x, 20, 'pressing dash does nothing');
  assert.ok(!happened(world, 'dash'));
  // Holding dash while jumping is not a dash jump either.
  step(world, { dash: true, jump: true, moveX: 1 });
  run(world, { dash: true, jump: true, moveX: 1 }, 0.2);
  assert.ok(world.player.speed <= CONFIG.player.runSpeed);
  assert.ok(!happened(world, 'dash'));
});

test('dash: the boots are in the equipment shed, and picking them up unlocks it for the run', () => {
  const boots = ROOMS.shed.items.find((item) => item.type === 'boots');
  const world = prisonWorld('shed', boots.x);
  assert.equal(currentPrompt(world).text, 'E: take the work boots');
  tap(world, 'interact');
  assert.equal(world.player.hasBoots, true);
  assert.match(currentMessage(world), /DASH/);
  assert.equal(canDash(world), true);
  const from = world.player.x;
  tap(world, 'dash');
  run(world, {}, 0.5);
  assert.ok(happened(world, 'dash'));
  assert.ok(Math.abs(Math.abs(world.player.x - from) - M.dashSpeed * M.dashSeconds) < 0.2 || world.player.x > 8);
  assert.equal(createWorld().player.hasBoots, false, 'a new run starts without them');
});

test('dash: the gym keeps every move, boots or not', () => {
  const world = createWorld(GYM);
  assert.equal(world.player.hasBoots, false);
  assert.equal(canDash(world), true);
});

test('noise: jumping and landing are small, a slide is quiet, a dash is loud', () => {
  const N = CONFIG.noise;
  assert.ok(N.jumpRadius < N.walkRadius && N.landRadius < N.walkRadius);
  assert.ok(N.slideRadius < N.walkRadius);
  assert.ok(N.dashRadius > N.runRadius);
  // A guard 2 m away with his back turned does not hear a standing jump. One 1 m away does.
  const sentry = (x) => ({ id: 'g', patrol: [x, x], startX: x, facing: 1 });
  const far = testWorld({ playerX: 20, guards: [sentry(22)] });
  step(far, { jump: true });
  runUntil(far, () => far.player.onGround, { jump: true }, 3);
  run(far, {}, 0.1);
  assert.equal(far.guards[0].state, 'calm');
  const near = testWorld({ playerX: 20, guards: [sentry(21.3)] });
  step(near, { jump: true });
  run(near, { jump: true }, 0.1);
  assert.equal(near.guards[0].state, 'suspicious');
  // A dash is heard from 10 m.
  const dashing = testWorld({ width: 60, playerX: 20, guards: [sentry(30)] });
  dashing.player.hasBoots = true;
  dashing.player.facing = -1;
  tap(dashing, 'dash');
  run(dashing, {}, 0.1);
  assert.equal(dashing.guards[0].state, 'suspicious');
});

test('noise: a jump at running speed is as loud as running, so hopping is not a silent sprint', () => {
  const sentry = { id: 'g', patrol: [26, 26], startX: 26, facing: 1 };
  const world = testWorld({ width: 60, playerX: 20, guards: [sentry] });
  step(world, { jump: true, moveX: -1, run: true });
  run(world, { jump: true, moveX: -1, run: true }, 0.05);
  assert.equal(world.guards[0].state, 'suspicious', 'heard from 6 m');
  const walking = testWorld({ width: 60, playerX: 20, guards: [sentry] });
  step(walking, { jump: true, moveX: -1 });
  runUntil(walking, () => walking.player.onGround, { jump: true, moveX: -1 }, 3);
  run(walking, {}, 0.1);
  assert.equal(walking.guards[0].state, 'calm', 'a walking jump is not');
});

// ---------- The Yard's layout ----------

test('yard: the Mess Hall has a creaky side door into it, and you arrive in the dark both ways', () => {
  const out = findPortal(PRISON, 'mh-yard');
  assert.equal(out.room.id, 'mess-hall');
  assert.equal(out.portal.creaky, true);
  assert.equal(out.portal.to, 'yard');
  const world = prisonWorld('mess-hall', out.portal.x);
  for (const guard of world.allGuards) guard.state = 'out';
  assert.equal(currentPrompt(world).text, 'UP: tap = fast and loud, hold = slow and quiet');
  runUntil(world, () => world.room.id === 'yard', { up: true }, 4);
  run(world, {}, 0.1);
  assert.equal(world.player.inDark, 'yd-dark');
  runUntil(world, () => world.room.id === 'mess-hall', { up: true }, 4);
  run(world, {}, 0.1);
  assert.equal(world.player.inDark, 'mh-dark-yard');
});

test('yard: court, bleachers, fences, two towers with ladders and guards, the shed, and one ground guard', () => {
  const order = ['low-fence', 'bench', 'tower-1', 'row-1', 'tall-fence', 'crate-1', 'shed-roof', 'tower-2'];
  const xs = order.map((id) => solid(id).x);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'left to right as in the spec');
  assert.equal(yard.ladders.length, 2);
  assert.equal(yard.cameras.filter((camera) => camera.kind === 'searchlight').length, 2);
  const world = prisonWorld('yard', 1.5);
  const towerGuards = world.guards.filter((guard) => guard.y > 0);
  assert.equal(towerGuards.length, 2);
  assert.equal(world.guards.length, 3, 'two tower guards and one on the ground');
  for (const guard of towerGuards) {
    const platform = yard.solids.find((entry) => entry.kind === 'platform' && Math.abs(entry.x - guard.x) < 2.1);
    assert.equal(guard.y, platform.top, 'each tower guard stands on his platform');
    const ladder = yard.ladders.find((entry) => Math.abs(entry.x - platform.x) < 2.1);
    assert.equal(ladder.top, platform.top);
    assert.ok((ladder.x - guard.x) * guard.facing < 0, 'the ladder comes up behind him');
    assert.ok(world.cameras.some((camera) => camera.guardId === guard.id), 'and he has a searchlight');
  }
  assert.ok(yard.hideSpots.some((spot) => spot.type === 'bleachers'), 'you can hide under the bleachers');
  assert.equal(yard.items.find((item) => item.type === 'basketball').type, 'basketball');
});

test('yard: the guards stay where they belong, even when chasing', () => {
  const world = inYard(60, 0, false);
  for (const camera of world.cameras) camera.off = true;
  const [ground, towerOne, towerTwo] = world.guards;
  for (const guard of world.guards) Object.assign(guard, { state: 'alert', lastKnownX: 60, trackTimer: 5 });
  run(world, {}, 8);
  assert.ok(ground.x <= solid('tall-fence').x - 0.9, 'the ground guard stops at the tall fence');
  assert.ok(towerOne.x >= 33.5 && towerOne.x <= 37.5 && towerOne.y === 5.8);
  assert.ok(towerTwo.x >= 69 && towerTwo.x <= 73);
  assert.equal(world.grab, null);
});

test('yard: a suspicious guard who cannot reach the spot looks from the edge of his stretch, then gives up', () => {
  const world = inYard(1.5, 0, false);
  for (const camera of world.cameras) camera.off = true;
  const tower = guardById(world, 'yd-tower-1');
  world.player.hiddenIn = 'elsewhere';
  world.pendingNoises.push({ x: 30, y: 5.8, radius: 6 });
  run(world, {}, 0.1);
  assert.equal(tower.state, 'suspicious');
  runUntil(world, () => tower.state === 'calm', {}, 12);
  assert.ok(tower.x >= 33.8);
});

// ---------- The jump challenge to the hatch, and the shed ----------

test('shed: the hatch is reached with jumps only, over the bleachers, the fence top, and the crates', () => {
  const world = inYard(39.2);
  assert.equal(world.player.hasBoots, false);
  leap(world, 40.9);
  assert.equal(world.player.y, solid('row-1').top);
  leap(world, 43.3);
  assert.equal(world.player.y, solid('row-2').top);
  walk(world, 43.8);
  leap(world, 45.9);
  assert.equal(world.player.y, solid('row-3').top);
  walk(world, 46.9);
  leap(world, 49.5, { run: true });
  assert.equal(world.player.y, solid('tall-fence').top, 'standing on top of the fence');
  leap(world, 53.7, { run: true });
  assert.equal(world.player.y, solid('crate-3').top);
  walk(world, 54.8);
  leap(world, 58.5, { run: true });
  assert.equal(world.player.y, solid('shed-roof').top);
  const hatch = yard.portals.find((portal) => portal.id === 'yd-hatch');
  walk(world, hatch.x);
  assert.equal(currentPrompt(world).text, 'UP: open the hatch and climb down');
  tap(world, 'up');
  assert.equal(world.room.id, 'shed');
  assert.equal(world.player.y, 0);
  assert.ok(!happened(world, 'dash'), 'no dash was used');
});

test('shed: the hatch cannot be reached from the ground, and the shed roof is too high to jump onto', () => {
  const world = inYard(61);
  assert.notEqual(currentPrompt(world)?.text, 'UP: open the hatch and climb down');
  tap(world, 'up');
  assert.equal(world.room.id, 'yard');
  step(world, { jump: true });
  runUntil(world, () => world.player.onGround, { jump: true }, 3);
  assert.equal(world.player.y, 0);
  assert.ok(solid('shed-roof').top - solid('crate-3').top < 1.5, 'but it is within a jump of the top crate');
});

test('shed: the door only opens from the inside, and you can go back up through the hatch', () => {
  const outside = yard.portals.find((portal) => portal.id === 'yd-shed-door');
  const world = inYard(outside.x);
  assert.equal(currentPrompt(world).text, 'Door, latched from the inside');
  tap(world, 'up');
  assert.equal(world.room.id, 'yard');
  assert.match(currentMessage(world), /Latched from the inside/);
  const inside = prisonWorld('shed', 7);
  tap(inside, 'up');
  assert.equal(inside.room.id, 'yard');
  assert.equal(inside.player.x, outside.x);
  const back = prisonWorld('shed', 2);
  assert.equal(currentPrompt(back).text, 'UP: climb up to the hatch');
  tap(back, 'up');
  assert.equal(back.room.id, 'yard');
  assert.equal(back.player.y, solid('shed-roof').top, 'out onto the roof');
});

// ---------- Fences ----------

test('fence: the low one can be jumped, the tall one cannot', () => {
  const low = solid('low-fence');
  const tall = solid('tall-fence');
  assert.ok(low.top < 1.5 && tall.top > 1.5);
  const world = inYard(6.9);
  run(world, { moveX: 1 }, 1);
  assert.ok(world.player.x < low.x, 'walking into it stops you');
  const started = world.time;
  leap(world, 9.3);
  assert.ok(world.player.x > low.x && world.player.y === 0, 'a jump clears it');
  const jumpSeconds = world.time - started;
  const other = inYard(48.4);
  leap(other, 51);
  assert.ok(other.player.x < tall.x, 'the tall fence stops a jump');
  // Climbing the low fence instead takes longer than jumping it.
  assert.ok(low.top / M.fenceClimbSpeed > jumpSeconds, `jumping (${jumpSeconds} s) is the fast way`);
});

test('fence: hold Up against any part of the chain-link to climb it, from either side, slowly', () => {
  assert.ok(M.fenceClimbSpeed < M.ladderClimbSpeed / 2, 'much slower than a ladder');
  const tall = solid('tall-fence');
  assert.equal(climbables(yard).filter((entry) => entry.fence).length, 4, 'two fences, two sides each');
  for (const side of [-1, 1]) {
    const world = inYard(tall.x + side * 1.2);
    run(world, { moveX: -side }, 0.5);
    const started = world.time;
    runUntil(world, () => world.player.climbing !== null, { up: true }, 1);
    runUntil(world, () => world.player.climbing === null && world.player.onGround, { up: true }, 6);
    assert.equal(world.player.y, tall.top);
    assert.equal(world.player.x, tall.x, 'you end up standing on top of it');
    assert.ok(world.time - started > tall.top / M.fenceClimbSpeed - 0.1, 'it takes a while');
    // Walk off the far side and you drop to the ground beyond it.
    runUntil(world, () => world.player.onGround && world.player.y === 0, { moveX: -side }, 3);
    assert.ok((world.player.x - tall.x) * -side > 0);
  }
});

test('fence: you are in plain view while climbing. Chain-link hides nothing', () => {
  const tall = solid('tall-fence');
  assert.equal(tall.seeThrough, true);
  assert.ok(!sightBlockers(yard).includes(tall));
  // A guard on the far side sees straight through it to a climber, half way up.
  const guard = { x: tall.x + 4, facing: -1 };
  const climber = { x: tall.x - 0.42, y: 0.4, crouching: false, hiddenIn: null, inDark: null };
  assert.equal(guardSeesPlayer(guard, climber, CONFIG.guard, CONFIG.player, sightBlockers(yard)), true);
  // And you cannot hide while on it: Up is busy climbing.
  const world = inYard(tall.x - 1);
  run(world, { moveX: 1 }, 0.4);
  run(world, { up: true }, 0.5);
  assert.notEqual(world.player.climbing, null);
  assert.equal(world.player.hiddenIn, null);
  assert.equal(world.player.inDark, null);
});

// ---------- Searchlights ----------

test('searchlight: a fixed path and a fixed beat, the same every run', () => {
  const one = createWorld();
  const two = createWorld();
  const seen = [];
  for (let second = 0; second < 40; second += 1) {
    run(one, {}, 1);
    run(two, {}, 1);
    seen.push([light(one, 'yd-light-1').x, light(one, 'yd-light-1').away]);
    assert.equal(light(one, 'yd-light-1').x, light(two, 'yd-light-1').x);
    assert.equal(light(one, 'yd-light-2').x, light(two, 'yd-light-2').x);
  }
  const def = yard.cameras[0];
  assert.ok(seen.every(([x]) => x >= def.min && x <= def.max));
  assert.ok(seen.some(([, away]) => away) && seen.some(([, away]) => !away));
  // One whole cycle: across, away, back, away.
  const cycle = ((def.max - def.min) / def.speed + def.awaySeconds) * 2;
  assert.deepEqual(cameraSweep(def, 3), cameraSweep(def, 3 + cycle));
  assert.equal(cameraSweep(def, 1).heading, 1);
  const turned = cameraSweep(def, (def.max - def.min) / def.speed + 0.5);
  assert.equal(turned.away, true, 'at the end of the sweep it swings away off the ground');
  assert.ok(Math.abs(turned.backIn - (def.awaySeconds - 0.5)) < 1e-9, 'and says when it will be back');
});

// The Yard with only searchlight 1 working, held still over x.
function underLight(x, playerX, quietGuards = true) {
  const world = inYard(playerX, 0, false);
  const down = { state: 'out', outFor: -1e6, radioAt: null };
  if (quietGuards) for (const guard of world.guards) Object.assign(guard, down);
  const lamp = light(world, 'yd-light-1');
  Object.assign(lamp, { min: x, max: x, speed: 0 });
  light(world, 'yd-light-2').off = true;
  return world;
}

test('searchlight: stepping into the pool is called in. Guards go Suspicious and walk over, and it counts', () => {
  const world = underLight(20, 20, false);
  const ground = guardById(world, 'yd-guard');
  ground.x = 34;
  run(world, {}, CONFIG.camera.noticeSeconds + 0.1);
  assert.ok(happened(world, 'searchlight'));
  assert.equal(world.stats.timesSpotted, 1);
  assert.match(currentMessage(world), /searchlight/i);
  assert.equal(ground.state, 'suspicious');
  assert.ok(Math.abs(ground.targetX - 20) < 0.1, 'he heads for where you were lit up');
  assert.equal(guardById(world, 'yd-tower-1').state, 'suspicious', 'the tower guard is looking too');
  assert.equal(world.seenByCamera, false, 'it is not a security camera: no part in the silent alarm');
  const before = ground.x;
  world.player.hiddenIn = 'elsewhere';
  run(world, {}, 2);
  assert.ok(ground.x < before, 'and he walks over');
});

test('searchlight: outside the pool, on a roof, or while it is swung away, you are not seen', () => {
  const outside = underLight(20, 23);
  run(outside, {}, 2);
  assert.equal(outside.stats.timesSpotted, 0);
  const roof = underLight(20, 20);
  roof.player.y = 5.4;
  run(roof, {}, 2);
  assert.equal(roof.stats.timesSpotted, 0, 'the pool is on the ground');
  const lamp = { ...createCamera(yard.cameras[0], 'yard') };
  const person = { x: lamp.max, y: 0, crouching: false, hiddenIn: null, inDark: null };
  assert.equal(cameraSeesPlayer({ ...lamp, x: lamp.max, away: false }, person, []), true);
  assert.equal(cameraSeesPlayer({ ...lamp, x: lamp.max, away: true }, person, []), false);
});

test('searchlight: solid cover blocks the light. The bench, the bleachers, and the shed cast safe shadows', () => {
  const blockers = sightBlockers(yard);
  const [one, two] = yard.cameras.map((def) => createCamera(def, 'yard'));
  const person = (x, crouching) => ({ x, y: 0, crouching, hiddenIn: null, inDark: null });
  // Crouched behind the bench at the west end of the court, with the pool right on top of you.
  const bench = solid('bench');
  const spot = bench.x - bench.halfWidth - 0.4;
  assert.equal(cameraSeesPlayer({ ...one, x: 13 }, person(spot, true), blockers), false);
  assert.equal(cameraSeesPlayer({ ...one, x: 13 }, person(spot, false), blockers), true, 'standing, you are lit');
  assert.equal(cameraSeesPlayer({ ...one, x: 13 }, person(spot, true), []), true, 'it is the bench that hides you');
  // Under the shed roof, in the path of Tower 2's light.
  const shedDoor = yard.portals.find((portal) => portal.id === 'yd-shed-door');
  assert.equal(cameraSeesPlayer({ ...two, x: shedDoor.x }, person(shedDoor.x, false), blockers), false);
  assert.equal(cameraSeesPlayer({ ...two, x: 66 }, person(66, false), blockers), true, 'past the shed you are lit');
  // The pool is drawn with the shadow missing, and the beam stops at the roof.
  const slices = poolSlices({ ...two, x: 57.5 }, blockers, 16);
  assert.ok(slices.includes(false) && slices.some((lit, i) => !lit && i > 4), 'part of the pool is dark');
  assert.ok(poolSlices({ ...two, x: 57.5 }, [], 16).every(Boolean), 'with no cover it is all lit');
  const beam = cameraLit({ ...two, x: 60 }, blockers);
  assert.ok(beam.some((point) => Math.abs(point.y - solid('shed-roof').top) < 0.01), 'the beam ends on the shed roof');
  // The bleachers: a light swung over them cannot reach the ground under the top row.
  const rows = { ...two, mountX: 55, x: 45.5, min: 40, max: 47 };
  assert.equal(cameraSeesPlayer(rows, person(45.6, true), blockers), false);
  // Chain-link and the roof ledge cast no shadow.
  assert.ok(!blockers.some((entry) => ['tall-fence', 'low-fence', 'roof-ledge', 'sill'].includes(entry.id)));
});

test('searchlight: in the game, crouching in the bench shadow keeps you safe as the pool passes over', () => {
  const bench = solid('bench');
  const world = inYard(bench.x - bench.halfWidth - 0.4, 0, false);
  for (const guard of world.allGuards) Object.assign(guard, { state: 'out', outFor: -1e6, radioAt: null });
  light(world, 'yd-light-2').off = true;
  run(world, { crouch: true }, 45);
  assert.equal(world.stats.timesSpotted, 0);
  // Stand up and the next pass catches you.
  runUntil(world, () => world.stats.timesSpotted === 1, {}, 30);
});

test('tower guard: knocked out from behind at the top of the ladder, and his searchlight stops for good', () => {
  const world = inYard(37, 0, false);
  const tower = guardById(world, 'yd-tower-1');
  const lamp = light(world, 'yd-light-1');
  Object.assign(guardById(world, 'yd-guard'), { state: 'out', outFor: -1e6, radioAt: null });
  runUntil(world, () => world.player.climbing === null && world.player.y === 5.8, { up: true }, 6);
  assert.equal(tower.state, 'calm', 'he did not notice you come up behind him');
  walk(world, tower.x + 0.9, { crouch: true });
  assert.equal(currentPrompt(world).text, 'SPACE: knock out');
  tap(world, 'action');
  assert.equal(tower.state, 'out');
  assert.equal(lamp.off, true);
  assert.ok(happened(world, 'lightOut'));
  assert.equal(light(world, 'yd-light-2').off, false, 'the other light carries on');
  // Standing in what was the pool is safe now, and it stays off after he wakes up.
  world.player.hiddenIn = 'elsewhere';
  run(world, {}, CONFIG.knockout.wakeSeconds + 1);
  assert.notEqual(tower.state, 'out', 'he has woken up');
  assert.equal(lamp.off, true, 'off for the rest of the run');
  assert.equal(cameraSeesPlayer(lamp, { x: lamp.x, y: 0, crouching: false, hiddenIn: null, inDark: null }, []), false);
});

test('tower guard: he is on the radio like everyone else, and a missed check-in sends the ground guard', () => {
  const world = createWorld();
  const tower = guardById(world, 'yd-tower-1');
  const ground = guardById(world, 'yd-guard');
  assert.equal(tower.label, 'Tower 1 guard');
  assert.ok(tower.radioAt > 0);
  assert.equal(tower.radioAt % CONFIG.radio.staggerSeconds, CONFIG.radio.firstSeconds % CONFIG.radio.staggerSeconds);
  Object.assign(tower, { state: 'out', outFor: 0 });
  runUntil(world, () => happened(world, 'missedCheckIn'), {}, 90);
  assert.match(currentMessage(world), /No answer from the Tower 1 guard/);
  assert.equal(ground.state, 'suspicious', 'the guard on the ground goes to look');
  assert.ok(Math.abs(ground.targetX - tower.x) < 0.1);
});

test('tower guard: out of reach from the ground. No knockout, no shove, no grab', () => {
  const world = inYard(34.6, 0, false);
  for (const camera of world.cameras) camera.off = true;
  guardById(world, 'yd-guard').x = 39;
  guardById(world, 'yd-guard').facing = 1;
  assert.equal(currentPrompt(world), null);
  tap(world, 'action');
  assert.equal(guardById(world, 'yd-tower-1').state, 'calm');
  assert.equal(world.stats.knockouts, 0);
  assert.ok(!happened(world, 'shove'));
});

// ---------- The roof route and the window ----------

test('roof: from the Tower 1 platform to the roof ledge is a jump, and back', () => {
  const ledgeTop = solid('roof-ledge').top;
  const world = inYard(34, 5.8);
  run(world, { moveX: -1 }, 1.5);
  assert.ok(world.player.y < ledgeTop, 'walking off the platform does not reach the ledge: you fall');
  const jumper = inYard(33.7, 5.8);
  leap(jumper, 31);
  assert.equal(jumper.player.y, ledgeTop);
  leap(jumper, 33.9);
  assert.equal(jumper.player.y, 5.8, 'and the same jump takes you back to the tower');
});

test('roof: the gap to the window sill needs the dash. A running jump falls short', () => {
  const ledgeTop = solid('roof-ledge').top;
  const sill = solid('sill');
  const gap = (solid('roof-ledge').x - solid('roof-ledge').halfWidth) - (sill.x + sill.halfWidth);
  assert.ok(gap >= 6);
  const world = inYard(11.4, ledgeTop);
  leap(world, 4.5, { run: true });
  assert.equal(world.player.y, 0, 'without the boots you land in the yard below');
  const booted = inYard(11.4, ledgeTop);
  booted.player.hasBoots = true;
  step(booted, { dash: true, jump: true, moveX: -1 });
  runUntil(booted, () => booted.player.onGround, { dash: true, jump: true, moveX: -1 }, 3);
  assert.equal(booted.player.y, sill.top, 'a dash jump makes it');
  assert.ok(booted.player.x <= sill.x + sill.halfWidth + 0.3);
  // Jump, then dash in the air, works too.
  const air = inYard(11.4, ledgeTop);
  air.player.hasBoots = true;
  step(air, { jump: true, moveX: -1, run: true });
  run(air, { jump: true, moveX: -1, run: true }, 0.25);
  step(air, { jump: true, moveX: -1, run: true, dash: true });
  runUntil(air, () => air.player.onGround, { jump: true, moveX: -1, run: true }, 3);
  assert.equal(air.player.y, sill.top);
});

test('window: in from the roof and out to the roof', () => {
  const sill = solid('sill');
  const world = inYard(3, sill.top);
  assert.equal(currentPrompt(world).text, 'UP: climb through the window');
  tap(world, 'up');
  assert.equal(world.room.id, 'guard-office');
  assert.equal(world.player.y, 0);
  const inside = ROOMS['guard-office'].portals.find((portal) => portal.id === 'go-window');
  assert.equal(world.player.x, inside.x);
  assert.equal(guardById(world, 'go-guard').state, 'asleep', 'it does not wake the sleeping guard');
  assert.equal(currentPrompt(world).text, 'UP: climb through the window');
  tap(world, 'up');
  assert.equal(world.room.id, 'yard');
  assert.equal(world.player.y, sill.top, 'back out on the sill');
  assert.equal(world.player.onGround, true);
});

test('window: it cannot be used from the ground under it', () => {
  const world = inYard(3);
  tap(world, 'up');
  assert.equal(world.room.id, 'yard');
  assert.notEqual(currentPrompt(world)?.text, 'UP: climb through the window');
});

test('window: out of the office, you can drop from the sill and leave by the Mess Hall door', () => {
  const world = prisonWorld('guard-office', 5.5);
  tap(world, 'up');
  for (const guard of world.allGuards) Object.assign(guard, { state: 'out', outFor: -1e6, radioAt: null });
  for (const camera of world.cameras) camera.off = true;
  runUntil(world, () => world.player.onGround && world.player.y === 0, { moveX: 1 }, 4);
  walk(world, 1.5);
  runUntil(world, () => world.room.id === 'mess-hall', { up: true }, 4);
});

// ---------- The basketball and the outer wall ----------

test('basketball: it bounces, and it is louder than a cup', () => {
  assert.ok(THROWABLES.basketball.noise > CONFIG.throwing.noiseRadius);
  assert.ok(THROWABLES.basketball.bounces >= 1);
  const ball = yard.items.find((item) => item.type === 'basketball');
  const onCourt = inYard(ball.x);
  assert.equal(currentPrompt(onCourt).text, 'E: pick up the basketball');
  tap(onCourt, 'interact');
  assert.equal(onCourt.player.carrying.type, 'basketball');
  // Thrown on open floor, to measure the bounces.
  const world = testWorld({ width: 80, playerX: 20, items: [{ id: 'ball', type: 'basketball', x: 20 }] });
  tap(world, 'interact');
  world.player.facing = 1;
  run(world, { throw: true }, 0.1);
  world.events.length = 0;
  runUntil(world, () => world.thrown.length === 0 && happened(world, 'clatter'), {}, 6);
  const landings = world.events.filter((event) => event.type === 'clatter');
  assert.equal(landings.length, THROWABLES.basketball.bounces + 1, 'one noise for each bounce and one when it stops');
  const xs = landings.map((event) => event.x);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'each bounce carries it further');
  assert.ok(xs.at(-1) - xs[0] > 1);
});

test('basketball: a big lure. It pulls a guard a cup would not reach', () => {
  // The guard stands 9 m past where a throw lands: out of earshot of a cup, in earshot of the ball.
  const sentry = { id: 'g', patrol: [35, 35], startX: 35, facing: 1 };
  for (const [type, expected] of [['cup', 'calm'], ['basketball', 'suspicious']]) {
    const world = testWorld({ width: 80, playerX: 20, guards: [sentry], items: [{ id: 'thing', type, x: 20 }] });
    tap(world, 'interact');
    run(world, { throw: true }, 0.1);
    runUntil(world, () => world.thrown.length === 0 && happened(world, 'clatter'), {}, 6);
    run(world, {}, 0.1);
    assert.equal(world.guards[0].state, expected, type);
  }
});

test('outer wall: too high, with a message, like the welded vent', () => {
  const world = inYard(yard.width - 1);
  assert.equal(currentPrompt(world).text, 'The outer wall');
  tap(world, 'up');
  assert.equal(currentMessage(world), "Too high. You'll need something to get over this.");
  assert.ok(happened(world, 'locked'));
  // No jump gets over it: the room ends there.
  step(world, { jump: true, moveX: 1, run: true });
  runUntil(world, () => world.player.onGround, { jump: true, moveX: 1, run: true }, 3);
  assert.ok(world.player.x <= yard.width - CONFIG.player.wallMargin + 1e-9);
  assert.equal(world.room.id, 'yard');
});

// ---------- The map ----------

test('map: the Yard and its towers show once you have been there', () => {
  const fresh = mapModel(createWorld());
  assert.equal(fresh.rooms.find((room) => room.id === 'yard').visited, false);
  assert.deepEqual(fresh.rooms.find((room) => room.id === 'yard').marks, []);
  const world = inYard(1.5);
  const model = mapModel(world);
  const box = model.rooms.find((room) => room.id === 'yard');
  assert.equal(box.visited, true);
  assert.equal(box.current, true);
  assert.deepEqual(box.marks, ['Tower 1', 'Tower 2']);
  const door = model.links.find((link) => link.from === 'mess-hall' && link.to === 'yard');
  assert.equal(door.known, true);
  assert.equal(door.creaky, true);
});

test('map: the roof route and the window only show once discovered', () => {
  const world = inYard(1.5);
  const roof = () => mapModel(world).rooms.find((room) => room.id === 'yard-roof');
  const windowLink = () => mapModel(world).links.find((link) => link.type === 'window');
  const ladderLink = () => mapModel(world).links.find((link) => link.from === 'yard-roof' && link.to === 'yard');
  assert.equal(roof().visited, false);
  assert.equal(windowLink().known, false);
  assert.equal(ladderLink().known, false);
  assert.deepEqual([windowLink().from, windowLink().to], ['guard-office', 'yard-roof'], 'the window joins the roof');
  assert.deepEqual([roof().floor, roof().col], [2, 3], 'the roof is on the top floor, beside the Guard Office');
  // Climb Tower 1: the roof is found.
  Object.assign(world.player, { x: 37, y: 0 });
  runUntil(world, () => world.player.climbing === null && world.player.y === 5.8, { up: true }, 6);
  run(world, {}, 0.1);
  assert.equal(roof().visited, true);
  assert.equal(roof().current, true);
  assert.equal(mapModel(world).rooms.find((room) => room.id === 'yard').current, false);
  assert.equal(ladderLink().known, true);
  assert.equal(windowLink().known, false, 'the window is still not on the map');
  // Walk up to the window: now it is.
  Object.assign(world.player, { x: 3, y: solid('sill').top });
  run(world, {}, 0.1);
  assert.equal(windowLink().known, true);
});

test('map: finding the window from inside the office shows a way to somewhere unknown', () => {
  const world = prisonWorld('guard-office', 5.5);
  run(world, {}, 0.1);
  const model = mapModel(world);
  assert.equal(model.links.find((link) => link.type === 'window').known, true);
  assert.equal(model.rooms.find((room) => room.id === 'yard-roof').visited, false);
});

test('map: Tower 2 is not the roof, and the shed is its own room', () => {
  const world = inYard(72.5);
  runUntil(world, () => world.player.climbing === null && world.player.y === 5.8, { up: true }, 6);
  run(world, {}, 0.1);
  assert.equal(mapModel(world).rooms.find((room) => room.id === 'yard-roof').visited, false);
  const model = mapModel(prisonWorld('shed', 4));
  assert.equal(model.rooms.find((room) => room.id === 'shed').current, true);
  assert.equal(model.links.filter((link) => [link.from, link.to].includes('shed')).length, 2, 'hatch and door');
});

// ---------- The camera and the timer ----------

test('camera: it lifts to follow you up a tower, and a jump does not move it', () => {
  const world = inYard(37);
  const base = goalLift(world);
  assert.equal(base, yard.viewLift);
  world.player.y = 1.5;
  assert.equal(goalLift(world), base, 'the top of a jump is below the height where it starts to lift');
  world.player.y = 5.8;
  assert.ok(goalLift(world) > base + 2);
  const framing = createFraming('smart');
  updateFraming(framing, world, 16 / 9, Infinity);
  assert.equal(framing.y, goalLift(world));
  const indoors = prisonWorld('mess-hall', 10);
  assert.equal(goalLift(indoors), 0, 'indoors it stays where it was');
});

test('timer: still 7:00', () => {
  assert.equal(CONFIG.headcountSeconds, 7 * 60);
});
