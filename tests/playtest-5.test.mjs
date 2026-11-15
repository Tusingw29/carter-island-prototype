// Step 12 (playtest 5): the searchlight shape, guards and solid props, quieter sneaking with a
// hearing meter, and the takedown system.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraSeesPlayer, createCamera, searchlightShape } from '../site/js/game/camera.js';
import { CONFIG } from '../site/js/game/config.js';
import { obstaclesFor } from '../site/js/game/guard.js';
import { intentFromGamepad, intentFromKeys } from '../site/js/game/intent.js';
import { mapModel } from '../site/js/game/map.js';
import { currentMessage } from '../site/js/game/messages.js';
import { playtestText } from '../site/js/game/playtest.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { GYM, PRISON, ROOMS } from '../site/js/game/rooms.js';
import { scoreRun } from '../site/js/game/run.js';
import { sightBlockers } from '../site/js/game/sight.js';
import { holdLeft, holdOptions } from '../site/js/game/takedown.js';
import { bodyPoints } from '../site/js/game/vision.js';
import { createWorld } from '../site/js/game/world.js';
import {
  eventTypes, guardById, knock, prisonWorld, run, runUntil, tap, testWorld,
} from './helpers.mjs';

const G = CONFIG.guard;
const T = CONFIG.takedown;
const yard = ROOMS.yard;
const sentry = (id, x, facing = 1, extra = {}) => ({ id, patrol: [x, x], startX: x, facing, ...extra });
const happened = (world, type) => eventTypes(world).includes(type);
const crate = (from, to, top) => ({
  id: `crate-${from}`, kind: 'crate', x: (from + to) / 2, halfWidth: (to - from) / 2, bottom: 0, top,
});
const solid = (id) => yard.solids.find((entry) => entry.id === id);

// ---------- Part 1, bug 1: the searchlight ----------

// An even-odd point-in-polygon test, written here so it shares nothing with the game's own.
function inOutline(outline, point) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
    const a = outline[i];
    const b = outline[j];
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

const person = (x, y = 0, crouching = false) => ({ x, y, crouching, hiddenIn: null, inDark: null });

test('searchlight: what is drawn and what detects you are the same shape, everywhere in the Yard', () => {
  const blockers = sightBlockers(yard);
  let checked = 0;
  let lit = 0;
  for (const def of yard.cameras) {
    const lamp = createCamera(def, 'yard');
    for (let aim = def.min; aim <= def.max; aim += 1.75) {
      const light = { ...lamp, x: aim };
      // The drawn light: the outline of the shape the renderer is given.
      const drawn = searchlightShape(light, blockers).fan;
      for (let x = 2.05; x < yard.width - 2; x += 0.45) {
        for (const y of [0, 1.1, 2.4, 3.3, 4.2, 5.4]) {
          for (const crouching of [false, true]) {
            const player = person(x, y, crouching);
            const height = crouching ? CONFIG.player.crouchHeight : CONFIG.player.standHeight;
            // Points right on the edge of the light are a coin toss between two ways of doing
            // the sums, so only bodies clearly in or clearly out are compared.
            const points = bodyPoints(x, height, 6, y);
            const votes = points.map((point) => inOutline(drawn, point));
            const nudged = points.map((point) => inOutline(drawn, { x: point.x + 0.02, y: point.y + 0.02 }));
            if (votes.some((vote, i) => vote !== nudged[i])) continue;
            checked += 1;
            const detected = cameraSeesPlayer(light, player, blockers);
            if (detected) lit += 1;
            assert.equal(detected, votes.some(Boolean), `light ${def.id} aimed at ${aim}, player at ${x}, ${y}`);
          }
        }
      }
    }
  }
  assert.ok(checked > 20000, `${checked} positions compared`);
  assert.ok(lit > 300, `${lit} of them in the light`);
});

test('searchlight: on top of the crates with the light nowhere near, you are not detected', () => {
  // Adam's screenshots from playtest 5.
  const blockers = sightBlockers(yard);
  const [, two] = yard.cameras.map((def) => createCamera(def, 'yard'));
  const top = solid('crate-2');
  const onCrates = person(55, top.top);
  // The old rule: on the stretch of floor the light is aimed at, and a clear line to the lamp.
  // That caught you here even though the beam passes below your feet into the side of the crate.
  const aimed = { ...two, x: 55 };
  assert.ok(Math.abs(onCrates.x - aimed.x) <= aimed.halfWidth, 'the old rule said yes');
  assert.equal(cameraSeesPlayer(aimed, onCrates, blockers), false);
  // Through a whole sweep of both lights, with the real game running: never called in.
  const world = prisonWorld('yard', 55);
  world.player.y = top.top;
  for (const guard of world.guards) Object.assign(guard, { state: 'out', outFor: -1e6, radioAt: null });
  run(world, {}, 60);
  assert.equal(world.stats.timesSpotted, 0);
  assert.ok(!happened(world, 'searchlight'));
});

test('searchlight: it hits whatever it reaches. On a platform it checks where you really are', () => {
  const blockers = sightBlockers(yard);
  const lamp = createCamera(yard.cameras[1], 'yard');
  // Aimed at the ground under the shed, most of the light lands on the shed roof instead. The
  // pool is drawn up there, and a player standing in it up there is lit.
  const roof = solid('shed-roof');
  const light = { ...lamp, x: 60 };
  const pool = searchlightShape(light, blockers).pools.find((entry) => entry.y === roof.top);
  assert.ok(pool, 'the pool is drawn on top of the roof it hits');
  const spot = (pool.from + pool.to) / 2;
  assert.equal(cameraSeesPlayer(light, person(spot, roof.top), blockers), true, 'lit, up on the roof');
  assert.equal(cameraSeesPlayer(light, person(spot - 3, roof.top), blockers), false, 'not on the dark part of it');
  // The crate stack is between the lamp and the ground west of it: cover.
  const west = person(solid('crate-1').x - 1.8, 0, true);
  assert.equal(cameraSeesPlayer({ ...lamp, x: 52 }, west, blockers), false, 'in the shadow of the stack');
  assert.equal(cameraSeesPlayer({ ...lamp, x: 52 }, west, []), true, 'take the crates away and it has you');
});

test('searchlight: pools are on the ground and on the tops of things, and there is no light while it is away', () => {
  const blockers = sightBlockers(yard);
  const lamp = createCamera(yard.cameras[0], 'yard');
  const open = searchlightShape({ ...lamp, x: 20 }, blockers);
  assert.equal(open.pools.length, 1);
  assert.equal(open.pools[0].y, 0);
  assert.ok(Math.abs(open.pools[0].from - 17.8) < 0.05 && Math.abs(open.pools[0].to - 22.2) < 0.05);
  // At the west end of its sweep the light stops against the bench: no pool behind it.
  const bench = solid('bench');
  const over = searchlightShape({ ...lamp, x: 13 }, blockers);
  assert.ok(over.pools.every((pool) => pool.from >= bench.x + bench.halfWidth), 'shadow behind the bench');
  // Tower 2's light, aimed under the shed: one pool up on the shed roof, one on the ground.
  const two = searchlightShape({ ...createCamera(yard.cameras[1], 'yard'), x: 60 }, blockers);
  assert.deepEqual(two.pools.map((pool) => pool.y).sort(), [0, solid('shed-roof').top]);
  assert.equal(searchlightShape({ ...lamp, x: 20, away: true }, blockers), null);
  assert.equal(searchlightShape({ ...lamp, x: 20, off: true }, blockers), null);
});

// ---------- Part 1, bug 2: guards and solid props ----------

// A guard at 20 already chasing a player at playerX, with a crate in between.
function chase(solids, playerX = 26) {
  const world = testWorld({ width: 60, playerX, guards: [sentry('g', 20)], solids });
  const guard = world.guards[0];
  Object.assign(guard, { state: 'alert', lastKnownX: playerX, trackTimer: 30, react: 0, detection: 1 });
  return { world, guard };
}

test('guards: low cover is vaulted, and it takes 0.8 s', () => {
  assert.equal(G.vaultSeconds, 0.8);
  const { world, guard } = chase([crate(22, 23, 1)]);
  runUntil(world, () => guard.vault !== null, {}, 2);
  assert.ok(guard.x < 22, 'he stops on the near side first');
  const started = world.time;
  const from = guard.x;
  run(world, {}, 0.4);
  assert.ok(guard.x > from && guard.x < 23.4, 'half way through he is half way over');
  assert.equal(world.grab, null);
  runUntil(world, () => guard.vault === null, {}, 2);
  assert.ok(Math.abs(world.time - started - G.vaultSeconds) < 0.03, `the vault took ${world.time - started} s`);
  assert.ok(guard.x >= 23.3, 'and he comes down on the far side');
  // The same chase with no crate gets there 0.8 s sooner.
  const open = chase([]);
  runUntil(open.world, () => open.guard.x >= guard.x, {}, 3);
  // The vault also covers 1.7 m, which running would have taken a third of a second.
  assert.ok(world.time - open.world.time > 0.4, 'the crate bought the player about half a second');
});

test('guards: tall cover and walls stop him', () => {
  for (const top of [1.5, 2.2, 4]) {
    const { world, guard } = chase([crate(22, 23, top)]);
    let furthest = guard.x;
    for (let i = 0; i < 6 * 120; i += 1) {
      run(world, {}, 1 / 120);
      furthest = Math.max(furthest, guard.x);
    }
    assert.ok(furthest <= 22 - 0.3, `a ${top} m crate: he never got past ${furthest}`);
    assert.equal(guard.vault, null);
    assert.equal(world.grab, null);
  }
  assert.ok(G.vaultMaxHeight >= 1.3 && G.vaultMaxHeight < 1.5);
});

test('guards: a lunge does not carry him through a crate', () => {
  const { world, guard } = chase([crate(21, 21.4, 2)], 21.9);
  guard.x = 20.6;
  run(world, {}, 3);
  assert.ok(guard.x <= 21 - 0.3 + 1e-6);
  assert.equal(world.grab, null);
});

test('guards: walking to a noise, he vaults low cover on the way and stops at tall cover', () => {
  const low = testWorld({ width: 60, playerX: 2, guards: [sentry('g', 20)], solids: [crate(22, 23, 1)] });
  low.pendingNoises.push({ x: 27, radius: 10 });
  low.player.hiddenIn = 'elsewhere';
  runUntil(low, () => low.guards[0].x > 26.9, {}, 12);
  const tall = testWorld({ width: 60, playerX: 2, guards: [sentry('g', 20)], solids: [crate(22, 23, 2.5)] });
  tall.pendingNoises.push({ x: 27, radius: 10 });
  tall.player.hiddenIn = 'elsewhere';
  runUntil(tall, () => tall.guards[0].state === 'calm' && tall.time > 1, {}, 15);
  assert.ok(tall.guards[0].x < 22, 'he looked from his side of it and gave up');
});

test('guards: no patrol in any room walks through anything', () => {
  for (const room of [...Object.values(PRISON.rooms), GYM.rooms.gym]) {
    for (const def of room.guards ?? []) {
      const obstacles = obstaclesFor(room, def.y ?? 0);
      const [from, to] = [Math.min(...def.patrol), Math.max(...def.patrol)];
      for (const block of obstacles) {
        const left = block.x - block.halfWidth - 0.35;
        const right = block.x + block.halfWidth + 0.35;
        assert.ok(to <= left || from >= right, `${def.id} patrols ${from} to ${to}, through ${block.id}`);
        const start = def.startX ?? def.patrol[0];
        assert.ok(start <= left || start >= right, `${def.id} starts inside ${block.id}`);
      }
    }
  }
  // And played out: three minutes of every guard on his beat, never inside a solid, never vaulting.
  const world = createWorld();
  world.player.hiddenIn = 'bed';
  for (let second = 0; second < 180; second += 1) {
    run(world, {}, 1);
    for (const guard of world.allGuards) {
      assert.equal(guard.vault, null, `${guard.id} had to vault on patrol`);
      for (const block of guard.obstacles) {
        assert.ok(Math.abs(guard.x - block.x) >= block.halfWidth, `${guard.id} is inside ${block.id}`);
      }
    }
  }
});

test('guards: in the Yard, the ground guard vaults the scorer\'s table and cannot pass the tall fence', () => {
  const world = prisonWorld('yard', 22);
  for (const camera of world.cameras) camera.off = true;
  const guard = guardById(world, 'yd-guard');
  const table = solid('table');
  Object.assign(guard, { x: 33, state: 'alert', lastKnownX: 22, trackTimer: 30, react: 0 });
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => guard.vault !== null, {}, 3);
  assert.ok(Math.abs(guard.x - (table.x + table.halfWidth + 0.35)) < 0.01, 'he stops at the table and climbs');
  runUntil(world, () => guard.vault === null && guard.x < table.x, {}, 2);
  // Sent east instead, the fence is as far as he gets.
  Object.assign(guard, { state: 'alert', lastKnownX: 60, trackTimer: 30, lostFor: 0 });
  run(world, {}, 6);
  assert.ok(guard.x < solid('tall-fence').x);
});

// ---------- Part 1, check 3: seen up close in the Cell Block ----------

test('Cell Block, seen at 1 m: the pause and the wind-up both apply. 0.95 s is the fastest grab', () => {
  const world = prisonWorld('cell-block', 21);
  const guard = guardById(world, 'cb-guard');
  Object.assign(guard, { x: 20, facing: 1, patrolDir: 1, pause: 0 });
  const alertAt = runUntil(world, () => guard.state === 'alert', {}, 2);
  assert.ok(Math.abs(guard.react - G.reactSeconds) < 0.02, 'the pause starts');
  const windUpAt = runUntil(world, () => guard.lunge > 0, {}, 2);
  assert.ok(Math.abs(windUpAt - alertAt - G.reactSeconds) < 0.03, 'no wind-up until the pause is over');
  const grabAt = runUntil(world, () => world.grab !== null, {}, 2);
  const total = grabAt - alertAt;
  assert.ok(Math.abs(total - (G.reactSeconds + G.lungeWindupSeconds)) < 0.03, `grabbed ${total} s after the "!"`);
  assert.ok(total > 0.9 && total < 1, 'which the score screen rounds to the 1.0 s Adam saw');
  // So that line means he was still within reach when the pause ended. Running from the "!"
  // gets clear of the room without a grab.
  const runner = prisonWorld('cell-block', 21);
  Object.assign(guardById(runner, 'cb-guard'), { x: 20, facing: 1, patrolDir: 1, pause: 0 });
  runUntil(runner, () => runner.room.id === 'mess-hall', { moveX: 1, run: true }, 5);
  assert.equal(runner.grab, null);
});

// ---------- Part 2: quieter sneaking ----------

test('quieter: walking is heard from 1 m, running is as loud as ever, crouching is silent and faster', () => {
  assert.equal(CONFIG.noise.walkRadius, 1);
  assert.equal(CONFIG.noise.runRadius, 8);
  assert.equal(CONFIG.noise.crouchRadius, 0);
  assert.ok(Math.abs(CONFIG.player.crouchSpeed / CONFIG.player.walkSpeed - 0.7) < 0.005, '70% of walking speed');
  const world = testWorld({ playerX: 10 });
  run(world, { moveX: 1, crouch: true }, 1);
  assert.ok(Math.abs(world.player.x - 10 - CONFIG.player.crouchSpeed) < 0.05);
  assert.equal(world.noiseRadius, 0);
  run(world, { moveX: 1 }, 0.1);
  assert.equal(world.noiseRadius, 1, 'the ring drawn round the player is the walking radius');
});

test('quieter: you can walk right up behind a guard and grab him without being heard', () => {
  const world = testWorld({ playerX: 14, guards: [sentry('g', 20)] });
  const guard = world.guards[0];
  runUntil(world, () => currentPrompt(world)?.text === 'SPACE: grab', { moveX: 1 }, 4);
  assert.equal(guard.hearing, 0, 'his hearing meter never moved');
  assert.equal(guard.state, 'calm');
  assert.ok(!happened(world, 'glance'));
  assert.ok(20 - world.player.x > CONFIG.noise.walkRadius, 'grab reach is just outside walking earshot');
});

test('hearing: noise fills a meter. It is not Suspicious at once', () => {
  // Running on the spot against the end wall, 6 m behind him. A tall crate between them means
  // this is about hearing alone: when he glances round he cannot see who is making the noise.
  const world = testWorld({ playerX: 0.5, guards: [sentry('g', 6.5)], solids: [crate(3, 4, 2.6)] });
  const guard = world.guards[0];
  run(world, { moveX: -1, run: true }, 0.2);
  assert.equal(guard.state, 'calm');
  assert.ok(guard.hearing > 0.15 && guard.hearing < 0.4, `part full after 0.2 s (${guard.hearing})`);
  const fullAt = runUntil(world, () => guard.state === 'suspicious', { moveX: -1, run: true }, 2);
  assert.ok(fullAt > 0.6 && fullAt < 1.1, `full after ${fullAt} s of it`);
  assert.equal(guard.targetX, 0.5, 'he walks to the sound');
  assert.equal(guard.hearing, 0);
});

test('hearing: part full, he glances back over his shoulder for a moment, then keeps patrolling', () => {
  const walker = { id: 'g', patrol: [6.5, 16], startX: 6.5, facing: 1 };
  const dark = { id: 'd', type: 'dark', x: 0.5, halfWidth: 1 };
  const world = testWorld({ playerX: 0.5, guards: [walker], hideSpots: [dark] });
  const guard = world.guards[0];
  runUntil(world, () => guard.glance > 0, { moveX: -1, run: true }, 1);
  assert.ok(guard.hearing >= G.glanceAt && guard.hearing < 1);
  assert.ok(happened(world, 'glance'));
  assert.equal(guard.facing, -1, 'he is looking back toward the noise');
  const stoodAt = guard.x;
  // Go quiet, in the dark: he sees nothing.
  run(world, {}, G.glanceSeconds - 0.1);
  assert.equal(guard.x, stoodAt, 'he stands still while he looks');
  run(world, {}, 0.3);
  assert.equal(guard.state, 'calm');
  assert.equal(guard.facing, 1, 'then he turns back');
  run(world, {}, 1);
  assert.ok(guard.x > stoodAt, 'and carries on along his beat');
  assert.equal(world.stats.timesSpotted, 0);
});

test('hearing: a glance is a real look. In the open behind him, he sees you', () => {
  const world = testWorld({ playerX: 0.5, guards: [sentry('g', 4.5)] });
  const guard = world.guards[0];
  runUntil(world, () => guard.glance > 0, { moveX: -1, run: true }, 1);
  run(world, {}, 0.1);
  assert.equal(guard.seesPlayer, true);
});

test('hearing: the meter drains when you go quiet', () => {
  const world = testWorld({ playerX: 0.5, guards: [sentry('g', 6.5)] });
  const guard = world.guards[0];
  run(world, { moveX: -1, run: true }, 0.2);
  const heard = guard.hearing;
  world.player.hiddenIn = 'elsewhere';
  run(world, {}, 0.2);
  assert.ok(Math.abs(heard - guard.hearing - 0.2 * G.hearDrainPerSecond) < 0.02);
  run(world, {}, 2);
  assert.equal(guard.hearing, 0);
  assert.equal(guard.state, 'calm');
});

test('hearing: closer is faster, and one loud noise fills the meter in one go', () => {
  const far = testWorld({ playerX: 0.5, guards: [sentry('g', 8)] });
  const near = testWorld({ playerX: 0.5, guards: [sentry('g', 2.5)] });
  run(far, { moveX: -1, run: true }, 0.2);
  run(near, { moveX: -1, run: true }, 0.2);
  assert.ok(near.guards[0].hearing > far.guards[0].hearing * 1.5);
  const bang = testWorld({ playerX: 2, guards: [sentry('g', 20)] });
  bang.player.hiddenIn = 'elsewhere';
  bang.pendingNoises.push({ x: 14, radius: 8 });
  run(bang, {}, 0.05);
  assert.equal(bang.guards[0].state, 'suspicious');
  assert.equal(bang.guards[0].targetX, 14);
});

test('noise rings: one-off noises are kept for half a second so they can be drawn', () => {
  const world = testWorld({ playerX: 20 });
  tap(world, 'jump');
  assert.ok(world.pings.some((ping) => ping.radius === CONFIG.noise.jumpRadius && ping.x === 20));
  run(world, {}, 1.5);
  assert.deepEqual(world.pings.filter((ping) => world.time - ping.at >= 0.5), []);
});

// ---------- Part 3: takedowns ----------

// Standing behind a guard who faces away, in grab reach. extra adds more guards or cover.
function behind(extra = {}) {
  const guards = [sentry('g', 20, 1, { talk: { type: 'story', text: 'The Black.' } }), ...(extra.guards ?? [])];
  return testWorld({ width: 80, playerX: 19.2, ...extra, guards });
}

// One press of Q (or Y) and he talks, two seconds later.
function askHim(world) {
  tap(world, 'ask');
  run(world, {}, T.interrogateSeconds + 0.05);
}

function grab(extra) {
  const world = behind(extra);
  tap(world, 'action');
  return world;
}

test('grab: close behind a guard who cannot see you, Space grabs him. He cannot call out', () => {
  const world = behind({ guards: [sentry('other', 60, 1)] });
  assert.equal(currentPrompt(world).text, 'SPACE: grab');
  tap(world, 'action');
  const [guard, other] = world.guards;
  assert.equal(guard.state, 'held');
  assert.equal(world.hold.guardId, 'g');
  assert.ok(happened(world, 'grabGuard'));
  assert.ok(!happened(world, 'knockout'), 'not a knockout yet');
  assert.equal(world.stats.knockouts, 0);
  assert.equal(world.stats.timesSpotted, 0);
  run(world, {}, 2);
  assert.equal(other.state, 'calm', 'nobody was called');
  assert.equal(guard.seesPlayer, false);
  assert.equal(currentPrompt(world), null, 'the choices have their own panel');
});

test('grab: not from the front, not on a guard who has seen you, and a sleeping guard can be grabbed', () => {
  const front = testWorld({ playerX: 20.8, guards: [sentry('g', 20)] });
  tap(front, 'action');
  assert.equal(front.hold, null);
  const office = prisonWorld('guard-office', 14.2);
  assert.equal(currentPrompt(office).text, 'SPACE: grab');
  tap(office, 'action');
  assert.equal(guardById(office, 'go-guard').state, 'held');
});

test('grab: the choices are shown with their buttons, and no two share a controller button', () => {
  const world = grab();
  const options = holdOptions(world);
  assert.deepEqual(options.map((option) => option.id), ['knockOut', 'interrogate', 'slam', 'drag']);
  assert.deepEqual(options.map((option) => option.keys), ['SPACE', 'Q', 'F', 'A / D']);
  assert.deepEqual(options.map((option) => option.pad), ['X', 'Y', 'LB', 'stick']);
  assert.equal(new Set(options.map((option) => option.pad)).size, options.length);
  // Step 14: Interrogate moved off Interact (E / A), which is for pick-ups and the keycard.
  const pad = (index) => intentFromGamepad({
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === index, value: i === index ? 1 : 0 })),
    axes: [0, 0],
  });
  assert.equal(pad(2).action, true);
  assert.equal(pad(3).ask, true);
  assert.equal(pad(4).throw, true);
  assert.equal(pad(0).ask, false, 'A is not part of the menu');
  assert.equal(intentFromKeys(new Set(['KeyQ'])).ask, true);
  assert.equal(intentFromKeys(new Set(['KeyE'])).ask, false);
  assert.equal(holdOptions(behind()).length, 0, 'nothing shown when nobody is held');
});

test('knock out: Space again chokes him out, as a knockout always was', () => {
  const world = grab();
  const guard = world.guards[0];
  tap(world, 'action');
  assert.equal(guard.state, 'out');
  assert.equal(world.hold, null);
  assert.equal(world.player.holding, null);
  assert.ok(happened(world, 'knockout'), 'with the hit feedback event from Step 8');
  assert.equal(world.stats.knockouts, 1);
  assert.deepEqual(world.stats.takedowns, { choke: 1, above: 0, pullIn: 0 });
  // He misses his radio check-in, and wakes after 75 s.
  runUntil(world, () => happened(world, 'missedCheckIn'), {}, 70);
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => guard.state !== 'out', {}, 80);
  assert.ok(guard.outFor === 0 && world.time > CONFIG.knockout.wakeSeconds);
});

test('interrogate: one press of Q, 2 s with a progress bar, and he talks. You cannot move meanwhile', () => {
  assert.equal(T.interrogateSeconds, 2);
  const world = grab();
  const guard = world.guards[0];
  const stoodAt = world.player.x;
  tap(world, 'ask');
  assert.ok(happened(world, 'ask'));
  // Nothing needs holding. Moving does nothing until he has talked.
  run(world, { moveX: -1 }, 1);
  assert.equal(world.player.x, stoodAt, 'no moving while interrogating');
  assert.ok(Math.abs(holdOptions(world)[1].progress - 0.5) < 0.03, 'the bar is half full');
  assert.equal(guard.interrogated, false);
  run(world, {}, 1.05);
  assert.equal(guard.interrogated, true);
  assert.ok(happened(world, 'talk'));
  assert.equal(world.stats.interrogations, 1);
  assert.deepEqual(world.intel, [{ from: 'Test guard', type: 'story', text: 'The Black.' }]);
  // He is still in your hands, and the menu is back: knock him out, or let him go.
  assert.equal(guard.state, 'held');
  assert.deepEqual(holdOptions(world).map((option) => option.id), ['knockOut', 'letGo', 'slam', 'drag']);
  assert.deepEqual(holdOptions(world).slice(0, 2).map((option) => option.keys), ['SPACE', 'Q']);
});

test('interrogate: his line is a speech bubble, and the payoff is spelled out in two messages', () => {
  const world = grab();
  askHim(world);
  assert.equal(world.speech.guardId, 'g');
  assert.equal(world.speech.text, 'The Black.');
  assert.ok(world.speech.until - world.time > 5);
  assert.equal(currentMessage(world), 'Radio code learned: his check-ins will be faked.');
  run(world, { moveX: -1 }, 5);
  assert.equal(currentMessage(world), 'He said: "The Black."', 'then the extra, as its own message');
});

test('interrogate: E and A do nothing while you hold a guard, and the break-free clock waits while he talks', () => {
  const world = grab({ items: [{ id: 'cup', type: 'cup', x: 19.2 }] });
  run(world, { interact: true }, 2.5);
  assert.equal(world.guards[0].interrogated, false);
  assert.equal(world.player.carrying, null, 'no pick-up either: no clash');
  const fresh = grab();
  askHim(fresh);
  assert.ok(fresh.hold.time < 0.2, 'two seconds of talking did not use up the six');
  assert.ok(holdLeft(fresh) > 0.95);
  // Space still knocks him out half way through the questions.
  const hasty = grab();
  tap(hasty, 'ask');
  run(hasty, {}, 1);
  tap(hasty, 'action');
  assert.equal(hasty.guards[0].state, 'out');
  assert.equal(hasty.guards[0].interrogated, false);
});

test('interrogate: his radio code. Knocked out, his check-ins are faked until he wakes, and nobody comes', () => {
  const world = grab({ guards: [sentry('other', 40, 1)] });
  const [guard, other] = world.guards;
  askHim(world);
  tap(world, 'action');
  assert.equal(guard.state, 'out');
  assert.equal(guard.codeKnown, true);
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => happened(world, 'checkInFaked'), {}, 70);
  assert.match(currentMessage(world), /^Check-in faked/);
  assert.equal(world.stats.checkInsFaked, 1);
  assert.ok(!happened(world, 'missedCheckIn'));
  assert.equal(other.state, 'calm', 'nobody is sent to look');
  // Once he wakes he answers for himself again.
  runUntil(world, () => guard.state !== 'out', {}, 80);
  world.events.length = 0;
  runUntil(world, () => eventTypes(world).filter((type) => type === 'checkIn').length >= 2, {}, 130);
  assert.ok(world.events.some((event) => event.type === 'checkIn' && event.guardId === 'g'));
});

test('interrogate: each guard only once per run', () => {
  const world = grab();
  const guard = world.guards[0];
  askHim(world);
  tap(world, 'action');
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => guard.state === 'calm', {}, 200);
  // Get behind him and grab him again.
  world.player.hiddenIn = null;
  Object.assign(guard, { facing: 1, hearing: 0, detection: 0 });
  world.player.x = guard.x - 0.8;
  tap(world, 'action');
  assert.equal(guard.state, 'held');
  assert.equal(holdOptions(world)[1].label, 'he has already talked');
  askHim(world);
  assert.equal(world.stats.interrogations, 1);
  assert.equal(createWorld().allGuards.every((entry) => !entry.interrogated), true, 'a new run starts fresh');
});

test('let go: after he talks you can let him go. He is dazed for 2 s, then raises the alarm', () => {
  const world = grab();
  const guard = world.guards[0];
  askHim(world);
  tap(world, 'ask');
  assert.equal(world.hold, null);
  assert.equal(guard.state, 'alert');
  assert.ok(Math.abs(guard.stun - T.releaseStunSeconds) < 0.05);
  assert.equal(world.stats.knockouts, 0, 'no knockout on your record');
  assert.equal(world.lastAlarm.kind, 'letGo');
  const stoodAt = guard.x;
  run(world, { moveX: -1, run: true }, T.releaseStunSeconds - 0.1);
  assert.equal(guard.x, stoodAt);
  run(world, { moveX: -1, run: true }, 0.5);
  assert.ok(guard.x < stoodAt, 'then he comes after you');
});

test('throw: F slams him to the floor. Stunned 2 s, loud, then he gets up Alert', () => {
  assert.equal(T.slamStunSeconds, 2);
  assert.ok(T.slamNoiseRadius > CONFIG.noise.runRadius, 'louder than running');
  const world = grab();
  const guard = world.guards[0];
  tap(world, 'throw');
  assert.ok(happened(world, 'slam'));
  assert.equal(world.hold, null);
  assert.equal(guard.state, 'alert');
  assert.ok(Math.abs(guard.stun - T.slamStunSeconds) < 0.05);
  assert.ok(world.pings.some((ping) => ping.radius === T.slamNoiseRadius), 'the noise');
  assert.equal(world.stats.slams, 1);
  assert.equal(world.stats.knockouts, 0);
  assert.equal(world.stats.timesSpotted, 1, 'it gives you away');
  const stoodAt = guard.x;
  run(world, { moveX: -1, run: true }, T.slamStunSeconds - 0.1);
  assert.equal(guard.x, stoodAt, 'two seconds to get away');
  assert.equal(world.grab, null);
  run(world, { moveX: -1, run: true }, 0.6);
  assert.ok(guard.x < stoodAt, 'then he is up and after you');
});

test('throw: the press that slams a guard does not also throw the cup you are carrying', () => {
  const world = behind({ items: [{ id: 'cup', type: 'cup', x: 19.2 }] });
  tap(world, 'interact');
  assert.equal(world.player.carrying.type, 'cup');
  tap(world, 'action');
  run(world, { throw: true }, 0.3);
  run(world, {}, 0.3);
  assert.ok(happened(world, 'slam'));
  assert.equal(world.player.carrying?.type, 'cup', 'still in your hand');
});

test('drag: move while holding him to walk him slowly somewhere better, then choose', () => {
  const world = grab();
  const guard = world.guards[0];
  const gap = guard.x - world.player.x;
  run(world, { moveX: -1, run: true, jump: true }, 2);
  assert.ok(Math.abs(world.player.x - (19.2 - 2 * T.dragSpeed)) < 0.05, 'slowly, whatever else you press');
  assert.equal(world.player.y, 0);
  assert.ok(Math.abs(guard.x - world.player.x - gap) < 0.01 || Math.abs(guard.x - world.player.x - T.holdGap) < 0.01);
  assert.equal(guard.state, 'held');
  assert.equal(world.player.facing, 1, 'you keep hold of him, facing him');
  tap(world, 'action');
  assert.equal(guard.state, 'out');
  assert.ok(Math.abs(guard.x - (world.player.x + T.holdGap)) < 0.05, 'he goes down where you took him');
});

test('break free: hold him more than 6 s without choosing and he gets loose and goes Alert', () => {
  assert.equal(T.holdSeconds, 6);
  const world = grab();
  const guard = world.guards[0];
  run(world, {}, 5.9);
  assert.equal(guard.state, 'held');
  assert.ok(holdLeft(world) < 0.03);
  run(world, {}, 0.2);
  assert.ok(happened(world, 'brokeFree'));
  assert.equal(world.hold, null);
  assert.equal(guard.state, 'alert');
  assert.ok(guard.react > 0, 'with the usual moment of shock before he comes for you');
  assert.equal(world.stats.timesSpotted, 1);
});

test('while holding: if another guard sees you, he goes Alert. The one you hold stays held', () => {
  const world = grab({ guards: [sentry('other', 26, -1)] });
  const [guard, other] = world.guards;
  runUntil(world, () => other.state === 'alert', {}, 4);
  assert.equal(guard.state, 'held');
  assert.equal(world.hold.guardId, 'g');
  // If he gets hold of you, the one you were holding is loose too.
  runUntil(world, () => world.grab !== null, {}, 8);
  assert.equal(world.hold, null);
  assert.equal(guard.state, 'alert');
});

test('while holding: no doors, no hiding, no pickups', () => {
  const door = { id: 'a', type: 'door', x: 19.2, to: 'test', toPortal: 'a' };
  const locker = { id: 'locker', type: 'locker', x: 19.2 };
  const world = behind({ portals: [door], hideSpots: [locker], items: [{ id: 'cup', type: 'cup', x: 19.2 }] });
  tap(world, 'action');
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, null);
  assert.equal(world.player.carrying, null);
  assert.equal(world.guards[0].state, 'held');
});

// ---------- What interrogating gets you ----------

test('talk: every guard has one extra, the same every run. Patrols, secrets, and 6 to 8 lines about the mine', () => {
  const guards = [...Object.values(PRISON.rooms), GYM.rooms.gym].flatMap((room) => room.guards ?? []);
  for (const guard of guards) {
    assert.ok(['patrols', 'secret', 'story'].includes(guard.talk?.type), `${guard.id} has something to say`);
  }
  const stories = guards.filter((guard) => guard.talk.type === 'story').map((guard) => guard.talk.text);
  assert.ok(stories.length >= 6 && stories.length <= 8, `${stories.length} story lines`);
  assert.equal(new Set(stories).size, stories.length, 'all different');
  assert.ok(stories.includes('Company calls it Ore Seven. Miners call it The Black. Nobody calls it safe.'));
  for (const line of stories) assert.ok(line.length < 90, 'short');
  assert.ok(guards.some((guard) => guard.talk.type === 'patrols'));
  assert.ok(guards.filter((guard) => guard.talk.type === 'secret').length >= 2);
  const again = createWorld().allGuards.map((guard) => guard.talk);
  assert.deepEqual(createWorld().allGuards.map((guard) => guard.talk), again);
});

// Grabs the named guard in the real prison and makes him talk.
function interrogate(roomId, guardId) {
  const world = prisonWorld(roomId, 2);
  const guard = guardById(world, guardId);
  const down = { state: 'out', outFor: -1e6, radioAt: null };
  for (const other of world.allGuards) if (other !== guard) Object.assign(other, down);
  for (const camera of world.cameras) camera.off = true;
  Object.assign(guard, { facing: 1, patrolDir: 1 });
  Object.assign(world.player, { x: guard.x - 0.8, y: guard.y });
  tap(world, 'action');
  assert.equal(guard.state, 'held', `${guardId} grabbed`);
  askHim(world);
  return { world, guard };
}

test('talk: a patrol reveal shows the room\'s guard routes on the map for 60 s', () => {
  assert.equal(T.patrolRevealSeconds, 60);
  const { world } = interrogate('mess-hall', 'mh-guard-1');
  for (const guard of world.allGuards) if (guard.state === 'out') guard.state = 'calm';
  const patrols = () => mapModel(world).rooms.find((room) => room.id === 'mess-hall').patrols;
  assert.equal(patrols().length, 2, 'both Mess Hall guards');
  const [one] = patrols();
  assert.ok(Math.abs(one.from - 7 / 38) < 1e-9 && Math.abs(one.to - 18 / 38) < 1e-9, 'each beat, end to end');
  assert.ok(one.at >= 0 && one.at <= 1, 'and where he is now');
  assert.deepEqual(mapModel(world).rooms.find((room) => room.id === 'cell-block').patrols, [], 'only that room');
  assert.equal(currentMessage(world), 'Radio code learned: his check-ins will be faked.');
  assert.match(world.messageQueue[0].text, /^Patrol reveal: .* on your map \(M\) for 60 seconds/);
  tap(world, 'action');
  world.player.hiddenIn = 'elsewhere';
  run(world, {}, 61);
  assert.deepEqual(patrols(), [], 'gone after a minute');
});

test('talk: a secret says where something is and puts it on the map', () => {
  const office = interrogate('guard-office', 'go-guard').world;
  assert.match(office.speech.text, /roof hatch/);
  assert.match(office.messageQueue[0].text, /^Secret learned: .*roof hatch/);
  assert.ok(office.knownPortals.has('yd-hatch') && office.knownPortals.has('mh-yard'));
  assert.equal(mapModel(office).links.find((link) => link.type === 'hatch').known, true);
  const stairwell = interrogate('stairwell', 'sw-guard').world;
  assert.match(stairwell.speech.text, /Maintenance Hall/);
  assert.ok(stairwell.found.has('ma-panel'));
});

test('talk: a story bit is one uneasy line, kept in your notes', () => {
  const { world, guard } = interrogate('cell-block', 'cb-guard');
  assert.match(world.speech.text, /deep shafts/);
  assert.match(world.messageQueue[0].text, /^He said: "Don't go near the deep shafts/);
  assert.deepEqual(world.intel.at(-1), { from: 'Cell Block guard', type: 'story', text: guard.talk.text });
});

// ---------- Extra takedowns ----------

const ledge = (from, to, top) => ({
  id: 'ledge', kind: 'ledge', x: (from + to) / 2, halfWidth: (to - from) / 2, bottom: top - 0.25, top, through: true,
});

test('from above: on a ledge over an unaware guard, Space drops on him. Instant knockout, small noise', () => {
  const guards = [sentry('g', 20), sentry('far', 40, 1)];
  const world = testWorld({ width: 60, playerX: 20.4, guards, solids: [ledge(15, 25, 3)] });
  world.player.y = 3;
  run(world, {}, 0.05);
  assert.equal(currentPrompt(world).text, 'SPACE: drop on him');
  tap(world, 'action');
  const guard = world.guards[0];
  assert.equal(guard.state, 'out');
  assert.equal(world.player.y, 0, 'you land where he stood');
  assert.ok(Math.abs(world.player.x - 20) < 0.01);
  assert.deepEqual(world.stats.takedowns, { choke: 0, above: 1, pullIn: 0 });
  assert.equal(world.stats.knockouts, 1);
  assert.ok(happened(world, 'knockout'));
  const thud = world.pings.find((ping) => ping.radius === CONFIG.noise.landRadius);
  assert.ok(thud, 'landing makes a small noise');
  assert.equal(world.guards[1].state, 'calm', 'not heard across the room');
  assert.equal(world.stats.timesSpotted, 0);
});

test('from above: not on a guard who is Alert, and not from the floor beside him', () => {
  const world = testWorld({ width: 60, playerX: 20.4, guards: [sentry('g', 20)], solids: [ledge(15, 25, 3)] });
  world.player.y = 3;
  Object.assign(world.guards[0], { state: 'alert', lastKnownX: 30, trackTimer: 0 });
  run(world, {}, 0.02);
  assert.notEqual(currentPrompt(world)?.text, 'SPACE: drop on him');
  const floor = testWorld({ width: 60, playerX: 20.9, guards: [sentry('g', 20)] });
  tap(floor, 'action');
  assert.equal(floor.stats.takedowns.above, 0);
});

test('from above: it works on the gym guard from the ledge over his patrol', () => {
  const world = createWorld(GYM);
  const guard = world.guards[0];
  const over = GYM.rooms.gym.solids.find((entry) => entry.id === 'ledge');
  Object.assign(world.player, { x: guard.x + 0.3, y: over.top });
  run(world, {}, 0.02);
  assert.equal(currentPrompt(world).text, 'SPACE: drop on him');
  tap(world, 'action');
  assert.equal(guard.state, 'out');
});

test('from a hiding spot: an unaware guard passing within reach can be pulled in. He is stored there', () => {
  const locker = { id: 'locker', type: 'locker', x: 20 };
  const walker = { id: 'g', patrol: [14, 26], startX: 14, facing: 1 };
  const world = testWorld({ width: 60, playerX: 20, guards: [walker], hideSpots: [locker] });
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, 'locker');
  assert.notEqual(currentPrompt(world).text, 'SPACE: pull in', 'not until he is close');
  const guard = world.guards[0];
  runUntil(world, () => currentPrompt(world).text === 'SPACE: pull in', {}, 10);
  assert.ok(Math.abs(guard.x - 20) <= T.pullInReach);
  tap(world, 'action');
  assert.equal(guard.state, 'out');
  assert.equal(guard.hiddenIn, 'locker', 'he is in the locker now');
  assert.equal(world.player.hiddenIn, null, 'and you have stepped out');
  assert.deepEqual(world.stats.takedowns, { choke: 0, above: 0, pullIn: 1 });
  assert.equal(world.stats.knockouts, 1);
  assert.equal(world.stats.timesSpotted, 0);
  // The spot is full.
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, null);
});

test('from a hiding spot: from a cart or under a table too, but not on a guard who knows your spot', () => {
  for (const spot of [{ id: 's', type: 'cart', x: 20 }, { id: 's', type: 'table', x: 20, halfWidth: 2.5 }]) {
    const world = testWorld({ width: 60, playerX: 20, guards: [sentry('g', 20.9, 1)], hideSpots: [spot] });
    tap(world, 'up');
    tap(world, 'action');
    assert.equal(world.guards[0].hiddenIn, 's', spot.type);
  }
  const locker = { id: 's', type: 'locker', x: 20 };
  const world = testWorld({ width: 60, playerX: 20, guards: [sentry('g', 20.9, 1)], hideSpots: [locker] });
  tap(world, 'up');
  Object.assign(world.guards[0], { state: 'alert', knownSpotId: 's', lastKnownX: 20 });
  assert.notEqual(currentPrompt(world)?.text, 'SPACE: pull in');
});

// ---------- Score screen ----------

test('score: takedowns by type, guards thrown down, interrogations, and check-ins faked', () => {
  const world = grab({ guards: [sentry('h', 30, 1), sentry('i', 40, 1)] });
  askHim(world);
  tap(world, 'action');
  world.player.x = 29.2;
  tap(world, 'action');
  tap(world, 'throw');
  world.stats.checkInsFaked = 2;
  world.over = 'win';
  const result = scoreRun(world);
  assert.deepEqual(result.takedowns, { choke: 1, above: 0, pullIn: 0 });
  assert.equal(result.slams, 1);
  assert.equal(result.interrogations, 1);
  assert.equal(result.checkInsFaked, 2);
  assert.equal(result.knockouts, 1);
  const text = playtestText(result, []);
  assert.match(text, /Takedowns: 1 from behind, 0 from above, 0 pulled into hiding/);
  assert.match(text, /Thrown down: 1\. Interrogations: 1\. Check-ins faked: 2\./);
});

test('the old instant knockout is gone: one press never knocks a standing guard out', () => {
  const world = behind();
  tap(world, 'action');
  assert.equal(world.guards[0].state, 'held');
  assert.equal(world.stats.knockouts, 0);
  // The helper used by older tests does both presses.
  const both = behind();
  knock(both);
  assert.equal(both.guards[0].state, 'out');
});
