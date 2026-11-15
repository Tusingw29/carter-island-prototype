// Step 10 (playtest 4): solid cover blocks sight, the picture quality steps back up, Adam's gym
// values, the shove, and throwables.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraLit, cameraSeesPlayer, createCamera } from '../site/js/game/camera.js';
import { CONFIG } from '../site/js/game/config.js';
import { intentFromGamepad, intentFromKeys } from '../site/js/game/intent.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { GYM, PRISON } from '../site/js/game/rooms.js';
import { shoveCharge } from '../site/js/game/shove.js';
import { FAN_POINTS, sightBlocked, sightBlockers } from '../site/js/game/sight.js';
import { THROWABLES, isThrowable, throwArc } from '../site/js/game/throwing.js';
import { coneLit, coneShape, guardSeesPlayer } from '../site/js/game/vision.js';
import { createWorld } from '../site/js/game/world.js';
import { QUALITY_STEPS, createQuality, qualityShare, watchQuality } from '../site/js/quality.js';
import {
  eventTypes, prisonWorld, run, runUntil, tap, testWorld,
} from './helpers.mjs';

const sentry = (id, x, facing = 1) => ({ id, patrol: [x, x], startX: x, facing });
const happened = (world, type) => eventTypes(world).includes(type);
const crate = (x, top, halfWidth = 0.5) => ({ id: `crate-${x}`, kind: 'crate', x, halfWidth, bottom: 0, top });
const person = (x, crouching = false, y = 0) => ({ x, y, crouching, hiddenIn: null, inDark: null });
const sees = (guard, player, solids) => guardSeesPlayer(guard, player, CONFIG.guard, CONFIG.player, solids);

// ---------- 1. Solid cover blocks sight ----------

test('sight: a tall crate hides you standing behind it', () => {
  const guard = { x: 10, facing: 1 };
  const tall = [crate(13, 2.2)];
  assert.equal(sees(guard, person(14.2), []), true, 'with no crate he sees you');
  assert.equal(sees(guard, person(14.2), tall), false, 'standing behind it, he does not');
  assert.equal(sees(guard, person(14.2, true), tall), false, 'nor crouching');
  assert.equal(sees(guard, person(12), tall), true, 'in front of it he still does');
});

test('sight: in the game, standing behind a tall crate never fills his meter', () => {
  const world = testWorld({ playerX: 24.2, guards: [sentry('g', 20)], solids: [crate(23, 2.2)] });
  run(world, {}, 4);
  const guard = world.guards[0];
  assert.equal(guard.seesPlayer, false);
  assert.equal(guard.detection, 0);
  assert.equal(guard.state, 'calm');
  assert.equal(world.stats.timesSpotted, 0);
  // Take the crate away and the same spot is in plain view.
  const open = testWorld({ playerX: 24.2, guards: [sentry('g', 20)] });
  runUntil(open, () => open.guards[0].state === 'alert', {}, 4);
});

test('sight: low cover only hides you when you crouch behind it', () => {
  const guard = { x: 10, facing: 1 };
  const low = [crate(13, 1)];
  assert.equal(sees(guard, person(14, false), low), true, 'standing, your head shows over it');
  assert.equal(sees(guard, person(14, true), low), false, 'crouched behind it you are hidden');
  assert.equal(sees(guard, person(14, true), []), true, 'crouching in the open does not hide you');
  // The same in the game.
  const world = testWorld({ playerX: 24, guards: [sentry('g', 20)], solids: [crate(23, 1)] });
  run(world, { crouch: true }, 3);
  assert.equal(world.guards[0].detection, 0);
  runUntil(world, () => world.guards[0].state === 'alert', {}, 4);
});

test('sight: the close-up rule needs a clear line too, and only works on his level', () => {
  const guard = { x: 10, facing: 1 };
  assert.equal(sees(guard, person(10.8, true), []), true, 'right in front of him, crouched: seen');
  assert.equal(sees(guard, person(10.9, true), [crate(10.45, 1.3, 0.1)]), false, 'a crate between you: not seen');
  assert.equal(sees(guard, person(10.8, false, 3), []), false, 'on a ledge over his head: not seen');
});

test('sight: the drawn cone stops at the obstacle and leaves its shadow dark', () => {
  const shape = coneShape({ x: 10, facing: 1 });
  const open = coneLit(shape, []);
  assert.ok(open.some((point) => point.x > 15), 'with nothing in the way the light reaches past 15 m');
  const tall = crate(13, 2.6);
  const lit = coneLit(shape, [tall]);
  assert.deepEqual(lit[0], shape.origin, 'the fan starts at the flashlight');
  assert.ok(lit.length - 1 <= FAN_POINTS, 'and fits the mesh the renderer made for it');
  for (const point of lit.slice(1)) {
    assert.ok(point.x <= tall.x - tall.halfWidth + 1e-6, `no light past the near face of the crate (${point.x})`);
    assert.ok(point.y >= -1e-9, 'or under the floor');
  }
  // A low crate: light carries on over the top of it, and the floor behind it is dark.
  const low = crate(13, 1);
  const over = coneLit(shape, [low]);
  assert.ok(over.some((point) => point.x > 14), 'light goes over low cover');
  const floorBehind = over.filter((point) => point.y < 0.05 && point.x > 13.5 && point.x < 15.5);
  assert.deepEqual(floorBehind, [], 'the floor just behind it is in shadow');
  // What is drawn is what he sees: every lit point has a clear line from the flashlight.
  for (const point of over.slice(1)) {
    const short = {
      x: shape.origin.x + (point.x - shape.origin.x) * 0.98, y: shape.origin.y + (point.y - shape.origin.y) * 0.98,
    };
    assert.equal(sightBlocked(shape.origin, short, [low]), false);
  }
});

test('sight: a camera is blocked by cover the same way', () => {
  const camera = { ...createCamera({ id: 'cam', min: 0, max: 20, halfWidth: 3, speed: 0 }, 'test'), x: 19 };
  // The camera hangs at 10 m. A tall crate at 17 stands between it and the far end of its sweep.
  const tall = [crate(17, 2.6)];
  assert.equal(cameraSeesPlayer(camera, person(18.2), []), true);
  assert.equal(cameraSeesPlayer(camera, person(18.2), tall), false, 'behind the crate: not seen');
  assert.equal(cameraSeesPlayer(camera, person(16.2), tall), true, 'on the camera side of it: seen');
  const low = [crate(17, 1)];
  assert.equal(cameraSeesPlayer(camera, person(17.85, false), low), true, 'low cover does not hide you standing');
  assert.equal(cameraSeesPlayer(camera, person(17.85, true), low), false, 'crouched tight against it, it does');
  const beam = cameraLit(camera, tall);
  assert.ok(beam.slice(1).every((point) => !(point.y < 0.05 && point.x > 17.6 && point.x < 18.5)), 'shadow drawn');
  // In the game it never registers you.
  const def = { id: 'cam', min: 10, max: 20, halfWidth: 3, speed: 0 };
  const world = testWorld({ playerX: 12.2, cameras: [def], solids: [crate(13.5, 2.6)] });
  run(world, {}, 2);
  assert.equal(world.seenByCamera, false);
  assert.equal(world.stats.timesSpotted, 0);
});

test('sight: a body behind a crate is not found', () => {
  const guards = [sentry('g', 20), sentry('down', 26)];
  const world = testWorld({ playerX: 2, guards, solids: [crate(24, 2.2)] });
  Object.assign(world.guards[1], { state: 'out', outAt: 0, outFor: 0, radioAt: null });
  run(world, {}, 3);
  assert.equal(world.stats.bodiesFound, 0);
  const open = testWorld({ playerX: 2, guards });
  Object.assign(open.guards[1], { state: 'out', outAt: 0, outFor: 0, radioAt: null });
  run(open, {}, 1);
  assert.equal(open.stats.bodiesFound, 1);
});

test('sight: every room checked. The prison has nothing solid in the lane; the gym crates all block', () => {
  // The Yard (Step 11) is the one place in the prison with cover in the lane. It has its own tests.
  for (const room of Object.values(PRISON.rooms).filter((entry) => !entry.outdoor)) {
    assert.deepEqual(sightBlockers(room), [], `${room.name}: furniture is on the back wall or in front of the lane`);
  }
  const gym = GYM.rooms.gym;
  const blockers = sightBlockers(gym);
  assert.equal(blockers.length, gym.solids.length);
  // Adam's screenshot: the gym guard at the left end of his stretch, facing the tall crate, with
  // the player standing on the floor behind it.
  const guard = { x: gym.guards[0].bounds[0], facing: -1 };
  const tall = gym.solids.find((solid) => solid.id === 'step-2');
  const behind = person(tall.x - tall.halfWidth - 2);
  assert.equal(sees(guard, behind, []), true, 'this is the bug: with no cover rule he saw straight through');
  assert.equal(sees(guard, behind, blockers), false);
  // The new low crate at the end of his patrol.
  const low = gym.solids.find((solid) => solid.id === 'low-cover');
  const walker = { x: low.x - 3, facing: 1 };
  const spot = low.x + low.halfWidth + 0.35;
  assert.equal(sees(walker, person(spot, true), blockers), false);
  assert.equal(sees(walker, person(spot, false), blockers), true);
});

// ---------- 2. Picture quality steps back up ----------

const frames = (quality, ms, count) => {
  for (let i = 0; i < count; i += 1) watchQuality(quality, ms);
};

test('quality: slow frames step it down to 55%, and fast frames step it back up to 100%', () => {
  assert.deepEqual([...QUALITY_STEPS], [1, 0.75, 0.55]);
  const quality = createQuality();
  frames(quality, 40, 240);
  assert.equal(qualityShare(quality), 0.55);
  // 60 frames a second for three seconds: up one step.
  frames(quality, 16.7, 179);
  assert.equal(qualityShare(quality), 0.55, 'not before three seconds');
  frames(quality, 16.7, 1);
  assert.equal(qualityShare(quality), 0.75);
  frames(quality, 16.7, 180);
  assert.equal(qualityShare(quality), 1);
  frames(quality, 16.7, 2000);
  assert.equal(qualityShare(quality), 1, 'and it stays there');
});

test('quality: one slow frame does not undo a run of fast ones, but it does restart the count', () => {
  const quality = createQuality();
  frames(quality, 40, 120);
  assert.equal(qualityShare(quality), 0.75);
  frames(quality, 16.7, 100);
  frames(quality, 30, 1);
  frames(quality, 16.7, 100);
  assert.equal(qualityShare(quality), 0.75);
  frames(quality, 16.7, 80);
  assert.equal(qualityShare(quality), 1);
});

test('quality: a machine that cannot hold the higher step is tried less and less often', () => {
  const quality = createQuality();
  frames(quality, 40, 120);
  const waits = [];
  for (let round = 0; round < 3; round += 1) {
    let waited = 0;
    while (qualityShare(quality) !== 1) {
      watchQuality(quality, 16.7);
      waited += 1;
    }
    waits.push(waited);
    // The higher step is too much for it: slow again, and back down.
    frames(quality, 40, 120);
    assert.equal(qualityShare(quality), 0.75);
  }
  assert.deepEqual(waits, [180, 360, 720]);
});

test('quality: the ?low link stays at the lowest step', () => {
  const quality = createQuality(true);
  assert.equal(qualityShare(quality), 0.55);
  frames(quality, 16.7, 5000);
  assert.equal(qualityShare(quality), 0.55);
});

// ---------- 3. Adam's gym values ----------

test('gym values: the numbers from Adam\'s sliders are the defaults', () => {
  const M = CONFIG.moves;
  assert.equal(M.jumpSpeed, 7.55);
  assert.equal(M.gravity, 19);
  assert.equal(M.fallGravity, 40);
  assert.equal(M.dashSpeed, 12.5);
  assert.equal(M.dashSeconds, 0.36);
  assert.ok(Math.abs((M.jumpSpeed ** 2) / (2 * M.gravity) - 1.5) < 0.005, 'a 1.5 m jump');
  assert.ok(Math.abs(M.dashSpeed * M.dashSeconds - 4.5) < 1e-9, 'a 4.5 m dash');
});

// ---------- 4. The shove ----------

const S = CONFIG.shove;

// A guard at 20 facing right with the player `gap` metres in front of him.
const facing = (gap, extra = {}) => testWorld({ width: 120, playerX: 20 + gap, guards: [sentry('g', 20)], ...extra });

test('shove: Space on a guard who is facing you stuns him for 1.5 s and knocks him back', () => {
  assert.equal(S.stunSeconds, 1.5);
  const world = facing(1);
  world.player.facing = -1;
  assert.equal(currentPrompt(world).text, 'SPACE: shove');
  tap(world, 'action');
  const guard = world.guards[0];
  assert.ok(happened(world, 'shove'));
  assert.ok(!happened(world, 'knockout'), 'it is not a knockout');
  assert.equal(world.stats.knockouts, 0);
  assert.ok(Math.abs(guard.x - (20 - S.pushMetres)) < 0.05, `he staggers back a metre (${guard.x})`);
  assert.ok(guard.stun > S.stunSeconds - 0.05);
  const stoodAt = guard.x;
  run(world, {}, S.stunSeconds - 0.1);
  assert.equal(guard.x, stoodAt, 'stunned: he does not move');
  assert.equal(world.grab, null, 'or grab');
  assert.equal(guard.lunge, 0);
  run(world, { moveX: 1, run: true }, 0.5);
  assert.ok(guard.x > stoodAt, 'then he is after you again');
});

test('shove: it sets off the Alert and counts as being spotted, once', () => {
  const world = facing(1);
  assert.equal(world.guards[0].state, 'calm');
  tap(world, 'action');
  assert.equal(world.guards[0].state, 'alert');
  assert.equal(world.stats.timesSpotted, 1);
  assert.equal(world.lastAlarm.kind, 'shove');
  // Already being chased: a second shove does not count again.
  const chased = facing(5);
  runUntil(chased, () => chased.guards[0].state === 'alert', {}, 5);
  assert.equal(chased.stats.timesSpotted, 1);
  chased.player.x = chased.guards[0].x + 1;
  tap(chased, 'action');
  assert.ok(happened(chased, 'shove'));
  assert.equal(chased.stats.timesSpotted, 1);
});

test('shove: it is loud, about the same as running', () => {
  assert.equal(S.noiseRadius, CONFIG.noise.runRadius);
  const world = testWorld({ width: 120, playerX: 21, guards: [sentry('g', 20), sentry('far', 80, 1)] });
  tap(world, 'action');
  assert.ok(world.noises.some((noise) => noise.radius === S.noiseRadius) || happened(world, 'shove'));
  // A guard in another part of a long room who cannot see you still comes: the room's alarm is up.
  assert.equal(world.guards[1].state, 'alert');
});

test('shove: it stops a lunge that is already winding up', () => {
  const world = facing(5);
  const guard = world.guards[0];
  runUntil(world, () => guard.lunge > 0, {}, 8);
  world.events.length = 0;
  tap(world, 'action');
  assert.ok(happened(world, 'shove'));
  assert.equal(guard.lunge, 0);
  run(world, {}, CONFIG.guard.lungeWindupSeconds + 0.2);
  assert.equal(world.grab, null, 'the grab never lands');
});

test('shove: an 8 second cooldown, with a meter', () => {
  assert.equal(S.cooldownSeconds, 8);
  const world = facing(1);
  assert.equal(shoveCharge(world), 1, 'ready at the start');
  tap(world, 'action');
  assert.ok(shoveCharge(world) < 0.05);
  const guard = world.guards[0];
  // Too soon: nothing happens but a "not ready" shake.
  world.player.x = guard.x + 1;
  world.events.length = 0;
  tap(world, 'action');
  assert.ok(!happened(world, 'shove'));
  assert.ok(happened(world, 'tooRisky'));
  assert.equal(currentPrompt(world).text, 'SHOVE NOT READY');
  assert.equal(currentPrompt(world).shake, true);
  // Half way through, the meter is half full.
  const fresh = facing(1);
  tap(fresh, 'action');
  run(fresh, { moveX: 1, run: true }, S.cooldownSeconds / 2);
  assert.ok(Math.abs(shoveCharge(fresh) - 0.5) < 0.02);
  run(fresh, { moveX: 1, run: true }, S.cooldownSeconds / 2);
  assert.equal(shoveCharge(fresh), 1);
});

test('shove: you turn to face a guard who is behind you, and it works from either side', () => {
  const world = facing(5);
  const guard = world.guards[0];
  runUntil(world, () => guard.state === 'alert', {}, 5);
  // He has caught up and is behind you while you face away.
  guard.x = world.player.x - 1;
  world.player.facing = 1;
  tap(world, 'action');
  assert.ok(happened(world, 'shove'));
  assert.equal(world.player.facing, -1);
  assert.ok(guard.x < world.player.x - 1.9, 'pushed away from you');
});

test('shove: takedowns from behind, unseen, need no cooldown', () => {
  const world = testWorld({ playerX: 19.2, guards: [sentry('g', 20), sentry('h', 30)] });
  world.shoveReadyAt = Infinity;
  assert.equal(currentPrompt(world).text, 'SPACE: grab');
  tap(world, 'action');
  tap(world, 'action');
  assert.equal(world.guards[0].state, 'out');
  assert.equal(world.stats.timesSpotted, 0);
  assert.ok(!happened(world, 'shove'));
});

test('shove: not from inside a hiding spot, and not on a sleeping guard', () => {
  const spot = { id: 'locker', type: 'locker', x: 21 };
  const hidden = facing(1, { hideSpots: [spot] });
  hidden.player.hiddenIn = 'locker';
  tap(hidden, 'action');
  assert.ok(!happened(hidden, 'shove'));
  const office = prisonWorld('guard-office', 14.2);
  tap(office, 'action');
  assert.ok(!happened(office, 'shove'));
  assert.ok(happened(office, 'grabGuard'), 'a sleeping guard is grabbed, from either side');
});

// ---------- 5. Throwables ----------

const T = CONFIG.throwing;
const cup = (x, id = 'cup') => ({ id, type: 'cup', x });

function carrying(options = {}) {
  const world = testWorld({ width: 120, playerX: 20, items: [cup(20)], ...options });
  tap(world, 'interact');
  return world;
}

// Holds the throw button for a moment and lets go. Returns where the item first landed.
function throwIt(world) {
  run(world, { throw: true }, 0.1);
  world.events.length = 0;
  let landed = null;
  runUntil(world, () => {
    landed = world.events.find((event) => event.type === 'clatter' || event.type === 'bonk') ?? landed;
    return landed !== null;
  }, {}, 4);
  return landed;
}

test('throwables: cups in the Mess Hall, soap in the Laundry, a few elsewhere, and a cup in the gym', () => {
  const kinds = (roomId) => PRISON.rooms[roomId].items.filter(isThrowable).map((item) => item.type);
  assert.ok(kinds('mess-hall').filter((type) => type === 'cup').length >= 2);
  assert.ok(kinds('laundry').includes('soap'));
  const elsewhere = ['cell-block', 'maintenance', 'stairwell'].flatMap(kinds);
  assert.ok(elsewhere.length >= 3);
  assert.deepEqual(GYM.rooms.gym.items.filter(isThrowable).map((item) => item.type), ['cup']);
  const ids = [...Object.values(PRISON.rooms), GYM.rooms.gym].flatMap((room) => (room.items ?? []).map((i) => i.id));
  assert.equal(new Set(ids).size, ids.length, 'every item has its own id');
  for (const type of new Set([...elsewhere, 'cup', 'soap'])) assert.ok(THROWABLES[type]);
});

test('throwables: pick up with E, carry one at a time', () => {
  const world = testWorld({ width: 120, playerX: 20, items: [cup(20, 'a'), cup(20.5, 'b')] });
  assert.equal(currentPrompt(world).text, 'E: pick up the cup');
  tap(world, 'interact');
  assert.deepEqual(world.player.carrying, { id: 'a', type: 'cup' });
  assert.ok(world.taken.has('a'));
  assert.ok(happened(world, 'pickup'));
  // The second one stays where it is while your hands are full.
  assert.match(currentPrompt(world).text, /Hands full/);
  tap(world, 'interact');
  assert.equal(world.player.carrying.id, 'a');
  assert.ok(!world.taken.has('b'));
});

test('throwables: F on the keyboard, Left Bumper on the controller', () => {
  assert.equal(intentFromKeys(new Set(['KeyF'])).throw, true);
  assert.equal(intentFromKeys(new Set(['KeyE'])).throw, false);
  const buttons = Array.from({ length: 17 }, (_, index) => ({ pressed: index === 4, value: index === 4 ? 1 : 0 }));
  const pad = intentFromGamepad({ buttons, axes: [0, 0] });
  assert.equal(pad.throw, true);
  assert.deepEqual(Object.entries(pad).filter(([name, value]) => name !== 'throw' && value), []);
});

test('throwables: hold to see the arc, let go to throw, and it lands where the arc said', () => {
  const world = carrying();
  world.player.facing = 1;
  run(world, { throw: true }, 0.5);
  assert.equal(world.aiming, true, 'aiming while the button is held');
  assert.equal(world.thrown.length, 0, 'nothing thrown yet');
  assert.notEqual(world.player.carrying, null);
  const arc = throwArc(world);
  const end = arc.at(-1);
  assert.ok(arc.length > 8, 'a dotted line of points');
  assert.ok(Math.max(...arc.map((point) => point.y)) > T.handHeight + 0.3, 'it rises first: an arc');
  assert.equal(end.y, 0);
  assert.ok(end.x - 20 > 4 && end.x - 20 < 8, `a short throw: ${end.x - 20} m`);
  const landed = throwIt(world);
  assert.ok(happened(world, 'clatter'));
  assert.ok(Math.abs(landed.x - end.x) < 0.05, 'it lands where the arc ended');
  assert.equal(world.player.carrying, null, 'your hands are empty again');
  assert.equal(world.aiming, false);
});

test('throwables: it flies the way you face', () => {
  const world = carrying();
  run(world, { moveX: -1 }, 0.05);
  const from = world.player.x;
  const landed = throwIt(world);
  assert.ok(landed.x < from - 4);
});

test('throwables: a hit on the head stuns him for 1.5 s and he looks toward where it came from', () => {
  assert.equal(T.stunSeconds, 1.5);
  // He stands 4 m ahead with his back to you. The arc comes down through head height there.
  const world = carrying({ guards: [sentry('g', 24.3, 1)] });
  const guard = world.guards[0];
  const hit = throwIt(world);
  assert.equal(hit.type, 'bonk');
  assert.ok(guard.stun > T.stunSeconds - 0.05);
  assert.equal(guard.state, 'suspicious');
  assert.equal(guard.facing, -1, 'he turns toward where it came from');
  assert.ok(Math.abs(guard.targetX - 20) < 0.5, 'and that is the spot he will check');
  assert.equal(world.stats.timesSpotted, 0, 'Suspicious is not spotted');
  const stoodAt = guard.x;
  world.player.hiddenIn = 'elsewhere';
  run(world, {}, T.stunSeconds - 0.1);
  assert.equal(guard.x, stoodAt, 'stunned: he stands there');
  assert.equal(guard.seesPlayer, false);
  run(world, {}, 1);
  assert.ok(guard.x < stoodAt, 'then he walks over to look');
});

test('throwables: a hit on a chasing guard stuns him too', () => {
  const world = carrying({ guards: [sentry('g', 26, -1)] });
  const guard = world.guards[0];
  runUntil(world, () => guard.state === 'alert' && guard.react <= 0, {}, 6);
  // Let him come within throwing distance, then let go.
  runUntil(world, () => guard.x - world.player.x < 4, {}, 5);
  assert.equal(throwIt(world).type, 'bonk');
  assert.ok(guard.stun > 0, 'stunned');
  assert.equal(guard.state, 'alert');
  assert.equal(world.grab, null);
});

test('throwables: a miss lands with a noise, and calm guards in earshot walk to that spot', () => {
  // One guard near where it will land, facing away, and one well out of earshot.
  const world = carrying({ guards: [sentry('near', 30, 1), sentry('far', 60, 1)] });
  const [near, far] = world.guards;
  const landed = throwIt(world);
  assert.equal(landed.type, 'clatter');
  run(world, {}, 0.05);
  assert.equal(near.state, 'suspicious');
  assert.ok(Math.abs(near.targetX - landed.x) < 0.01, 'he heads for where it landed, not for you');
  assert.equal(far.state, 'calm', `${60 - landed.x} m away is out of earshot`);
  assert.ok(60 - landed.x > T.noiseRadius);
  assert.equal(world.stats.timesSpotted, 0);
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => Math.abs(near.x - landed.x) < 0.1, {}, 10);
});

test('throwables: a lure pulls a guard off his post, so you can get past behind him', () => {
  // He stands 4.9 m away, facing you, while you stand still in a dark patch. A throw is flat: by
  // the time it reaches him it is below his head, so it carries on and lands behind him.
  const dark = { id: 'd', type: 'dark', x: 20, halfWidth: 1 };
  const world = carrying({ guards: [sentry('g', 24.9, -1)], hideSpots: [dark] });
  const guard = world.guards[0];
  world.player.facing = 1;
  const landed = throwIt(world);
  assert.equal(landed.type, 'clatter', 'it goes past him');
  assert.ok(landed.x > guard.x + 1);
  run(world, {}, 2);
  assert.equal(guard.facing, 1, 'he has turned his back to you to go and look');
  assert.equal(guard.state, 'suspicious');
  assert.equal(world.stats.timesSpotted, 0);
});

test('throwables: a crate stops a throw, and the noise is where it drops', () => {
  const world = carrying({ solids: [crate(22.5, 3)] });
  const landed = throwIt(world);
  assert.ok(landed.x < 22.01, `it drops in front of the crate (${landed.x})`);
  const arcEnd = throwArc({ ...world, player: { ...world.player, carrying: { id: 'x', type: 'cup' } } }).at(-1);
  assert.ok(arcEnd.x < 22.01, 'and the arc shows that before you throw');
});

test('throwables: no throwing from inside a hiding spot, while dragging, or with empty hands', () => {
  const empty = testWorld({ playerX: 20 });
  run(empty, { throw: true }, 0.2);
  run(empty, {}, 0.2);
  assert.equal(empty.aiming, false);
  assert.ok(!happened(empty, 'throw'));
  const hidden = carrying({ hideSpots: [{ id: 'locker', type: 'locker', x: 20 }] });
  tap(hidden, 'up');
  assert.equal(hidden.player.hiddenIn, 'locker');
  run(hidden, { throw: true }, 0.2);
  run(hidden, {}, 0.2);
  assert.notEqual(hidden.player.carrying, null, 'still in hand');
});

test('throwables: used up for the run, and back in their spots when a new run starts', () => {
  const world = createWorld();
  world.player.hiddenIn = null;
  const item = world.room.items.find(isThrowable);
  world.player.x = item.x;
  tap(world, 'interact');
  assert.equal(world.player.carrying.id, item.id);
  throwIt(world);
  run(world, {}, 3);
  assert.ok(world.taken.has(item.id), 'it does not come back during the run');
  assert.equal(world.thrown.length, 0);
  const next = createWorld();
  assert.ok(!next.taken.has(item.id));
  assert.equal(next.player.carrying, null);
});

test('throwables: the gym cup sits on the tall crate, and can be picked up and thrown', () => {
  const world = createWorld(GYM);
  const item = GYM.rooms.gym.items[0];
  const tall = GYM.rooms.gym.solids.find((solid) => solid.id === 'step-2');
  assert.equal(item.y, tall.top);
  Object.assign(world.player, { x: item.x, y: item.y });
  tap(world, 'interact');
  assert.equal(world.player.carrying.type, 'cup');
  const landed = throwIt(world);
  assert.ok(landed.x > item.x + 3, 'it lands along the guard\'s stretch');
});
