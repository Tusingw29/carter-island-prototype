// Step 15: regression tests for the outside review (docs/reviews/codex-review-1.md). Each
// reproduction from the review is here as a test, under the finding it came from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraLit, cameraSeesPlayer, createCamera } from '../site/js/game/camera.js';
import { CONFIG } from '../site/js/game/config.js';
import { edgePlacement, meterMarker } from '../site/js/game/edge.js';
import { createFraming, updateFraming, visibleSpan } from '../site/js/game/framing.js';
import { heatLabel, lockLeft } from '../site/js/game/heat.js';
import { currentMessage } from '../site/js/game/messages.js';
import { canHear, pingRings } from '../site/js/game/noise.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { ROOMS } from '../site/js/game/rooms.js';
import { outcomeText } from '../site/js/game/run.js';
import { inFan } from '../site/js/game/sight.js';
import { holdInfo } from '../site/js/game/takedown.js';
import {
  beamStrength, bodyPoints, closeZone, coneLit, coneShape, guardSeesPlayer,
} from '../site/js/game/vision.js';
import { createWorld, stepWorld } from '../site/js/game/world.js';
import { frontDoorThenDropRun, ventRun } from './bot/routes.mjs';
import { rusherCohort } from './bot/rusher.mjs';
import {
  STEP, eventTypes, guardById, intent, prisonWorld, run, runUntil, tap, testWorld,
} from './helpers.mjs';

const G = CONFIG.guard;
const H = CONFIG.heat;
const sentry = (id, x, facing = 1) => ({ id, patrol: [x, x], startX: x, facing });
const happened = (world, type) => eventTypes(world).includes(type);
const step = (world, keys = {}) => stepWorld(world, intent(keys), STEP);
const down = { state: 'out', outFor: -1e6, radioAt: null };

// ---------- R1: door escalation ----------

// In the Mess Hall with guard 2 chasing, ready to run out of the east hall into the Stairwell.
function chasedInMessHall(heat = 0) {
  const world = prisonWorld('mess-hall', 34.5);
  world.heat = heat;
  const chaser = guardById(world, 'mh-guard-2');
  Object.assign(chaser, { x: 31, facing: 1, patrolDir: 1 });
  runUntil(world, () => chaser.state === 'alert', {}, 4);
  return { world, chaser };
}
const fleeEast = (world) => runUntil(world, () => world.room.id === 'stairwell', { moveX: 1, run: true }, 4);

test('R1 heat: it starts at zero, rises one level per door escape from a hunt, and never comes down', () => {
  const { world } = chasedInMessHall();
  assert.equal(world.heat, 0);
  assert.equal(heatLabel(world), '');
  fleeEast(world);
  assert.equal(world.heat, 1);
  assert.equal(heatLabel(world), 'HEAT 1: PURSUIT');
  assert.ok(happened(world, 'heatUp'));
  // Walking through a door with nobody chasing does not raise it, and nor does time.
  for (const guard of world.allGuards) Object.assign(guard, down);
  run(world, {}, 30);
  world.player.x = 0.9;
  runUntil(world, () => world.room.id === 'mess-hall', { moveX: -1 }, 3);
  assert.equal(world.heat, 1);
  assert.equal(H.maxLevel, 3);
});

test('R1 heat 1, pursuit: one chasing guard follows through the door, about 1 s after you, with a warning', () => {
  assert.equal(H.followSeconds, 1);
  const { world, chaser } = chasedInMessHall();
  fleeEast(world);
  const leftAt = world.time;
  assert.equal(currentMessage(world), "He's following you!");
  assert.ok(happened(world, 'doorBang'), 'a bang on the door before he comes through');
  assert.equal(chaser.roomId, 'mess-hall', 'not through yet');
  runUntil(world, () => chaser.roomId === 'stairwell', { moveX: 1, run: true }, 2);
  assert.ok(Math.abs(world.time - leftAt - 1) < 0.03, `he came through ${world.time - leftAt} s after you`);
  assert.ok(world.player.x - chaser.x > 5, 'never on top of you: you have had a second to run');
  assert.equal(chaser.state, 'alert');
  assert.ok(chaser.react > 0, 'and he takes a moment to find you');
  assert.equal(world.guards.includes(chaser), true);
});

test('R1 heat 1, pursuit: he follows through ONE door. At the next he stops and searches, then walks home', () => {
  const { world, chaser } = chasedInMessHall();
  fleeEast(world);
  runUntil(world, () => chaser.roomId === 'stairwell', { moveX: 1, run: true }, 2);
  // On through the creaky door into the Guard Office.
  world.player.x = 24;
  tap(world, 'up');
  assert.equal(world.room.id, 'guard-office');
  assert.equal(chaser.following, null);
  run(world, {}, 2);
  assert.equal(chaser.roomId, 'stairwell', 'he does not follow a second time');
  assert.equal(chaser.state, 'searching');
  // When he gives up, he goes back to the Mess Hall and his patrol.
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => chaser.roomId === 'mess-hall', {}, 90);
  assert.equal(chaser.state, 'calm');
  assert.equal(chaser.pursued, false, 'ready to follow again in the next hunt');
});

test('R1: vents and the one-way drop are not doors. No heat, no pursuit, no lock', () => {
  const world = prisonWorld('guard-office', 19.5);
  world.heat = 2;
  const sleeper = guardById(world, 'go-guard');
  Object.assign(sleeper, { state: 'alert', lastKnownX: 19.5, react: 0, trackTimer: 1 });
  world.lock = { roomId: 'guard-office', until: world.time + 6 };
  assert.ok(lockLeft(world) > 5);
  tap(world, 'up');
  assert.equal(world.room.id, 'cell-block', 'the drop still works in a lockdown');
  assert.equal(world.heat, 2);
  run(world, {}, 2);
  assert.equal(sleeper.roomId, 'guard-office');
  assert.equal(sleeper.following, null);
});

test('R1 heat 2, lockdown: when an Alert starts, the doors and halls of that room lock for 6 s', () => {
  assert.equal(H.lockSeconds, 6);
  const world = prisonWorld('stairwell', 20);
  world.heat = 2;
  world.cameras.forEach((camera) => { camera.off = true; });
  const guard = guardById(world, 'sw-guard');
  Object.assign(guard, { x: 16, patrolMin: 16, patrolMax: 16, facing: 1, postFacing: 1, turnEvery: 0 });
  assert.equal(lockLeft(world), 0);
  runUntil(world, () => guard.state === 'alert', {}, 4);
  assert.ok(happened(world, 'doorsLock'));
  assert.ok(Math.abs(lockLeft(world) - 6) < 0.02);
  // The door does not open, and nor does the hall at the other end.
  world.player.x = 24;
  tap(world, 'up');
  assert.equal(world.room.id, 'stairwell');
  assert.match(currentMessage(world), /^Locked down! \d s\. Vents still open\./);
  world.player.x = 0.5;
  run(world, { moveX: -1 }, 0.2);
  assert.equal(world.room.id, 'stairwell');
  // Six seconds after the Alert began they open again.
  Object.assign(guard, down);
  run(world, {}, 6);
  assert.equal(lockLeft(world), 0);
  world.player.x = 24;
  tap(world, 'up');
  assert.equal(world.room.id, 'guard-office');
});

test('R1 heat 2: below it nothing locks, and at it a guard bursting in after you locks the room', () => {
  const calm = prisonWorld('stairwell', 20);
  calm.heat = 1;
  const guard = guardById(calm, 'sw-guard');
  Object.assign(guard, { x: 16, patrolMin: 16, patrolMax: 16, facing: 1, postFacing: 1, turnEvery: 0 });
  runUntil(calm, () => guard.state === 'alert', {}, 4);
  assert.equal(lockLeft(calm), 0);
  const { world, chaser } = chasedInMessHall(1);
  fleeEast(world);
  assert.equal(world.heat, 2);
  assert.equal(lockLeft(world), 0, 'not until he arrives');
  runUntil(world, () => chaser.roomId === 'stairwell', { moveX: 1, crouch: true }, 2);
  assert.ok(lockLeft(world) > 5.9, 'the doors lock behind him');
});

test('R1 heat 3, radio ahead: the guards in the room you flee into are Alert and facing your door', () => {
  const { world } = chasedInMessHall(2);
  const post = guardById(world, 'sw-guard');
  post.facing = 1;
  // At heat 2 the Mess Hall locked when the chase began. This test is about the next room.
  assert.ok(lockLeft(world) > 0);
  world.lock = null;
  fleeEast(world);
  assert.equal(world.heat, 3);
  assert.equal(heatLabel(world), 'HEAT 3: RADIO AHEAD');
  assert.ok(happened(world, 'radioAhead'));
  assert.equal(post.state, 'alert', 'no "?" first: he was told you were coming');
  assert.equal(post.facing, -1, 'facing the hall you came through');
  assert.ok(post.react > G.reactSeconds - 0.05, 'with the usual reaction pause');
  assert.ok(lockLeft(world) > 5.9, 'and it is an Alert, so at this heat the doors lock too');
  assert.equal(world.stats.spottedBy.other, 0, 'it is the same hunt: not a new spotting');
  // The office sleeper is not on the radio, so nobody warns him.
  const office = prisonWorld('stairwell', 24);
  office.heat = 2;
  const guard = guardById(office, 'sw-guard');
  Object.assign(guard, { state: 'alert', lastKnownX: 24, react: 0, trackTimer: 1, hunting: true });
  tap(office, 'up');
  assert.equal(office.room.id, 'guard-office');
  assert.equal(office.heat, 3);
  assert.equal(guardById(office, 'go-guard').state, 'asleep');
});

test('R1 acceptance: the review\'s 30 rusher runs, and the clean routes with no heat at all', () => {
  const cohort = rusherCohort();
  const { all, ...summary } = cohort;
  console.log(`\n  Rusher, 30 departures: ${JSON.stringify(summary)}\n`);
  assert.equal(cohort.runs, 30);
  // Before Step 15 this bot won 30 of 30 with no grab and no capture, in about 25 seconds.
  assert.ok(cohort.winsWithoutAGrab <= 3, 'nearly every rush is now caught hold of at a locked door');
  assert.ok(cohort.meanGrabs >= 1);
  assert.ok(cohort.finalCaptures + cohort.solitaryTrips >= 3, 'and some end in solitary or capture');
  assert.ok(all.every((entry) => entry.heat >= 2), 'every rush drives the heat up');
  // Clean sneaking, the vents, and the drop: no heat, no locks, same results.
  for (const route of [frontDoorThenDropRun, ventRun]) {
    const result = route();
    assert.equal(result.world.over, 'win');
    assert.equal(result.world.result.rank, 'ghost');
    assert.equal(result.world.heat, 0);
    assert.equal(result.world.lock, null);
  }
});

// ---------- R5: drawings match checks ----------

// What is drawn for a guard: his beam, cut off by cover, and his close-awareness box.
function drawnSeesBody(guard, player, blockers = []) {
  const fan = coneLit(coneShape(guard), blockers);
  const zone = closeZone(guard);
  const height = player.sliding ? CONFIG.moves.slideHeight
    : (player.crouching ? CONFIG.player.crouchHeight : CONFIG.player.standHeight);
  return bodyPoints(player.x, height, 6, player.y ?? 0).some((point) => {
    const inBox = point.x >= zone.x0 && point.x <= zone.x1 && point.y >= zone.y0 && point.y <= zone.y1;
    // The box is drawn whole. A point in it still needs a clear line from his flashlight.
    return inFan(fan, point) || (inBox && guardSeesPlayer(guard, { ...player }, G, CONFIG.player, blockers));
  });
}

test('R5: the review\'s case. Guard at 10, crouched player at 10.1: seen, and inside a drawn shape', () => {
  const guard = { x: 10, y: 0, facing: 1 };
  const duck = { x: 10.1, y: 0, crouching: true, hiddenIn: null, inDark: null };
  assert.equal(guardSeesPlayer(guard, duck), true);
  const beamOnly = bodyPoints(duck.x, 0.9).some((point) => inFan(coneLit(coneShape(guard)), point));
  assert.equal(beamOnly, false, 'the beam alone does not cover him: that was the mismatch');
  const zone = closeZone(guard);
  assert.deepEqual(zone, { x0: 10, x1: 10 + G.closeSightDistance, y0: 0, y1: G.closeSightHeight });
  assert.ok(bodyPoints(duck.x, 0.9).some((point) => point.x >= zone.x0 && point.x <= zone.x1 && point.y <= zone.y1));
  assert.equal(drawnSeesBody(guard, duck), true, 'the close-awareness box is drawn, and he is in it');
  // Behind the guard, or beyond the box and under the beam: not seen, and not in either shape.
  for (const x of [9.6, 11.6]) {
    const other = { ...duck, x };
    assert.equal(guardSeesPlayer(guard, other), drawnSeesBody(guard, other), `crouched at ${x}`);
  }
});

test('R5: guard detection matches the drawn shapes for standing, crouching, sliding, and jumping', () => {
  const crate = { id: 'c', kind: 'crate', x: 13, halfWidth: 0.5, bottom: 0, top: 1 };
  const tall = { id: 't', kind: 'crate', x: 15.5, halfWidth: 0.5, bottom: 0, top: 2.4 };
  const stances = [
    { crouching: false }, { crouching: true }, { sliding: true },
    { crouching: false, y: 0.8 }, { crouching: false, y: 1.4 },
  ];
  let checked = 0;
  let seen = 0;
  for (const facing of [1, -1]) {
    for (const blockers of [[], [crate, tall]]) {
      // Mirror the cover for a guard facing left.
      const cover = blockers.map((box) => ({ ...box, x: 10 + facing * (box.x - 10) }));
      const guard = { x: 10, y: 0, facing };
      const fan = coneLit(coneShape(guard), cover);
      for (let offset = -2; offset <= 8.5; offset += 0.07) {
        for (const stance of stances) {
          const player = { x: 10 + facing * offset, y: 0, hiddenIn: null, inDark: null, ...stance };
          const height = stance.sliding ? CONFIG.moves.slideHeight : (stance.crouching ? 0.9 : 1.7);
          const points = bodyPoints(player.x, height, 6, player.y);
          // Leave out bodies with a point within 2 cm of the edge of the light: there the
          // drawn outline and the exact sum can round differently.
          const near = points.some((point) => (
            inFan(fan, point) !== inFan(fan, { x: point.x + 0.02 * facing, y: point.y + 0.02 })
              || inFan(fan, point) !== inFan(fan, { x: point.x - 0.02 * facing, y: point.y - 0.02 })
          ));
          if (near) continue;
          checked += 1;
          const logic = guardSeesPlayer(guard, player, G, CONFIG.player, cover);
          if (logic) seen += 1;
          assert.equal(logic, drawnSeesBody(guard, player, cover), `facing ${facing}, offset ${offset.toFixed(2)}`);
        }
      }
    }
  }
  assert.ok(checked > 2500 && seen > 600, `${checked} bodies compared, ${seen} of them seen`);
});

// What is drawn for a camera: its beam. A body is in it if any of its six points is.
const inDrawnBeam = (camera, player, blockers = []) => (
  bodyPoints(player.x, player.crouching ? 0.9 : 1.7, 6, player.y ?? 0)
    .some((point) => inFan(cameraLit(camera, blockers), point))
);

test('R5: the review\'s camera case. Stairwell camera aimed at 16.5, standing player at 15.3', () => {
  const camera = createCamera({ id: 'c', min: 16.5, max: 21, halfWidth: 1.2, speed: 1.2 }, 'stairwell');
  const player = { x: 15.3, y: 0, crouching: false, hiddenIn: null, inDark: null };
  assert.equal(cameraSeesPlayer(camera, player), inDrawnBeam(camera, player), 'the check is the drawn beam');
  assert.equal(cameraSeesPlayer(camera, player), false, 'and at 15.3 he is outside it');
  // The review's sweep: 100 positions 5 cm apart. It found 13 disagreements. Now none.
  let disagree = 0;
  let seen = 0;
  for (let x = 15; x < 20; x += 0.05) {
    for (const crouching of [false, true]) {
      const body = { ...player, x, crouching };
      if (cameraSeesPlayer(camera, body)) seen += 1;
      if (cameraSeesPlayer(camera, body) !== inDrawnBeam(camera, body)) disagree += 1;
    }
  }
  assert.equal(disagree, 0);
  assert.ok(seen > 40, 'and it does still see people');
  // Jumping through the beam and cover in it are the drawn shape too.
  const crate = [{ id: 'c', kind: 'crate', x: 16.9, halfWidth: 0.3, bottom: 0, top: 2.6 }];
  for (const body of [{ ...player, x: 16.5, y: 1.2 }, { ...player, x: 16.2 }, { ...player, x: 17.5 }]) {
    assert.equal(cameraSeesPlayer(camera, body, crate), inDrawnBeam(camera, body, crate));
  }
});

// ---------- R6: watched hiding ----------

// The review's locker fixture: guard at 10 facing a player at 11, who hides at one-third awareness.
function watchedHide() {
  const locker = { id: 'locker', type: 'locker', x: 11 };
  const world = testWorld({ playerX: 11, guards: [sentry('g', 10)], hideSpots: [locker] });
  const guard = world.guards[0];
  while (guard.detection < G.glimpseThreshold) step(world);
  const before = { time: world.time, detection: guard.detection };
  tap(world, 'up');
  return { world, guard, before };
}

test('R6: hiding at one-third awareness no longer jumps the meter to full', () => {
  const { world, guard, before } = watchedHide();
  assert.equal(world.player.hiddenIn, 'locker');
  assert.notEqual(guard.state, 'alert', 'it was "!" in 1/120 s before');
  assert.ok(guard.detection < before.detection + 0.05, 'the meter carries on from where it was');
  assert.equal(guard.knownSpotId, 'locker', 'but he does remember the spot');
  assert.ok(happened(world, 'sawHide'));
  // You are told at the spot, at once.
  const prompt = currentPrompt(world);
  assert.equal(prompt.text, 'HE SAW YOU HIDE.  UP: get out');
  assert.equal(prompt.x, world.player.x);
  assert.equal(prompt.shake, true);
  // The meter keeps filling at its usual rate, and only then is it the "!".
  const alertAt = runUntil(world, () => guard.state === 'alert', {}, 4);
  assert.ok(alertAt - before.time > 0.6, `the "!" came ${alertAt - before.time} s after you hid`);
  assert.equal(guard.alertRecord.kind, 'watchedHiding');
});

test('R6: a 0.35 s reach-in tell before he pulls you out, and getting out during it saves you', () => {
  assert.equal(G.reachInSeconds, 0.35);
  const { world, guard } = watchedHide();
  runUntil(world, () => guard.reach > 0, {}, 6);
  const reachAt = world.time;
  assert.ok(happened(world, 'reachIn'));
  assert.equal(world.grab, null, 'he does not have you yet');
  assert.equal(currentPrompt(world).text, 'HE IS REACHING IN!  UP: get out');
  // Stay put and he has you, 0.35 s later.
  const stayed = structuredClone(world);
  runUntil(stayed, () => stayed.grab !== null, {}, 1);
  assert.ok(Math.abs(stayed.time - reachAt - 0.35) < 0.02);
  assert.match(stayed.lastGrab.alarmKind, /watchedHiding/);
  // Jump out and run during the tell and he grabs an empty locker.
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, null);
  run(world, { moveX: 1, run: true }, 0.6);
  assert.equal(world.grab, null);
  assert.ok(happened(world, 'reachMiss'));
  assert.ok(guard.stun > 0, 'and loses a moment');
});

test('R6: hiding unseen is still safe, and a guard who watched you can still pull you out', () => {
  const locker = { id: 'locker', type: 'locker', x: 11 };
  const unseen = testWorld({ playerX: 11, guards: [sentry('g', 14, 1)], hideSpots: [locker] });
  tap(unseen, 'up');
  run(unseen, {}, 6);
  assert.equal(unseen.guards[0].knownSpotId, null);
  assert.equal(unseen.guards[0].state, 'calm');
  const { world } = watchedHide();
  runUntil(world, () => world.grab !== null, {}, 8);
});

// ---------- R2: slide recovery ----------

test('R2: chained slides no longer beat running. The review measured 6.91 m/s', () => {
  assert.equal(CONFIG.moves.slideSpeed, 7);
  assert.equal(CONFIG.moves.slideRecoverySeconds, 0.35);
  const world = testWorld({ width: 200, playerX: 10 });
  for (let i = 0; i < 10 / STEP; i += 1) {
    step(world, { moveX: 1, crouch: true, jump: !world.player.sliding && !world.jumpWasHeld });
  }
  const speed = (world.player.x - 10) / 10;
  assert.ok(speed < CONFIG.player.runSpeed - 1, `chained slides average ${speed} m/s`);
  assert.ok(speed > CONFIG.player.crouchSpeed, 'still faster than crouch-walking');
});

test('R2: one slide, the low-ceiling slide, jump buffering, and the controller are as they were', () => {
  const world = testWorld({ width: 60, playerX: 10 });
  step(world, { moveX: 1 });
  step(world, { moveX: 1, crouch: true, jump: true });
  assert.equal(world.player.sliding, true, 'a slide starts on the step you press it');
  const from = world.player.x;
  runUntil(world, () => !world.player.sliding, { moveX: 1, crouch: true }, 1);
  const slideLength = CONFIG.moves.slideSpeed * CONFIG.moves.slideSeconds;
  assert.ok(Math.abs(world.player.x - from - slideLength) < 0.1, 'still 3.15 m');
  // During the recovery the same buttons do not start another, and after it they do.
  step(world, { moveX: 1, crouch: true });
  step(world, { moveX: 1, crouch: true, jump: true });
  assert.equal(world.player.sliding, false);
  run(world, { moveX: 1, crouch: true }, CONFIG.moves.slideRecoverySeconds);
  step(world, { moveX: 1, crouch: true, jump: true });
  assert.equal(world.player.sliding, true);
  // A jump straight after a slide is not held up by the recovery.
  const hop = testWorld({ width: 60, playerX: 10 });
  step(hop, { moveX: 1 });
  step(hop, { moveX: 1, crouch: true, jump: true });
  runUntil(hop, () => !hop.player.sliding, { moveX: 1, crouch: true }, 1);
  step(hop, { moveX: 1 });
  step(hop, { moveX: 1, jump: true });
  assert.ok(hop.player.vy > 0 && !hop.player.onGround, 'jumping is instant');
  // Under a low ceiling the slide still carries on until there is room to stand.
  const low = { id: 'low', kind: 'wall', x: 14, halfWidth: 2.5, bottom: 0.75, top: 4 };
  const tunnel = testWorld({ width: 60, playerX: 11.2, solids: [low] });
  step(tunnel, { moveX: 1 });
  step(tunnel, { moveX: 1, crouch: true, jump: true });
  runUntil(tunnel, () => !tunnel.player.sliding, { moveX: 1, crouch: true }, 3);
  assert.ok(tunnel.player.x > 16.5, 'out the far side');
});

// ---------- R7: full awareness off screen ----------

test('R7: a guard at full awareness keeps a red arrow at the edge of the screen, on all four edges', () => {
  const full = { id: 'g', kind: 'guard', fill: 1, seeing: true, full: true };
  const size = [1280, 720];
  for (const [x, y, edge] of [[-300, 300, 'left'], [1500, 300, 'right'], [600, -90, 'up'], [600, 900, 'down']]) {
    const placement = edgePlacement(x, y, ...size);
    assert.equal(placement.edge, edge);
    assert.ok(placement.left >= 26 && placement.left <= 1254 && placement.top >= 26 && placement.top <= 694);
    const marker = meterMarker(full, placement);
    assert.deepEqual(marker, { hidden: false, state: 'full', arrow: edge }, `${edge}: shown, red, pointing`);
  }
  // On screen his own big "!" is there, so the meter icon is hidden: never two icons.
  assert.equal(meterMarker(full, edgePlacement(600, 300, ...size)).hidden, true);
  // A filling guard and a full camera are shown wherever they are.
  const filling = { ...full, fill: 0.5, full: false };
  const inView = edgePlacement(600, 300, ...size);
  assert.deepEqual(meterMarker(filling, inView), { hidden: false, state: 'filling', arrow: null });
  assert.equal(meterMarker({ ...full, kind: 'camera' }, edgePlacement(600, 300, ...size)).hidden, false);
});

test('R7: in every camera mode, a chasing guard outside the picture gets the arrow', () => {
  for (const mode of ['smart', 'close', 'wide', 'room']) {
    const world = testWorld({ width: 120, playerX: 20, guards: [sentry('g', 110, -1)] });
    Object.assign(world.guards[0], { state: 'alert', react: 0.5, detection: 1 });
    const framing = createFraming(mode);
    updateFraming(framing, world, 16 / 9, Infinity);
    const [left, right] = visibleSpan(framing, 16 / 9);
    // Along the floor, a point's place on screen is its share of the visible stretch.
    const screenX = ((world.guards[0].x - left) / (right - left)) * 1280;
    const placement = edgePlacement(screenX, 300, 1280, 720);
    assert.equal(placement.edge, 'right', `${mode}: he is off the right of the picture`);
    const meter = { id: 'g', kind: 'guard', fill: 1, seeing: false, full: true };
    assert.equal(meterMarker(meter, placement).arrow, 'right');
  }
});

// ---------- R8: noise rings and stunned beams ----------

test('R8: a noise is drawn at its full reach from the first instant, at its real origin', () => {
  const ping = { x: 24, y: 1.2, radius: 12.5, at: 10 };
  const first = pingRings(ping, 10);
  assert.equal(first.boundary, 12.5, 'the full radius at once (it started at 60% before)');
  assert.deepEqual([first.x, first.y], [24, 1.2], 'no offset from where the noise was made');
  assert.equal(first.pulse, 0);
  assert.equal(first.fade, 1);
  const later = pingRings(ping, 10.25);
  assert.equal(later.boundary, 12.5, 'the boundary does not move');
  assert.ok(later.pulse > 0 && later.pulse < later.boundary, 'the pulse grows inside it');
  // The drawn boundary is the hearing boundary, for doors, throws, a dash, and a landing.
  const { noise } = CONFIG;
  const radii = [CONFIG.door.slamRadius, CONFIG.throwing.noiseRadius, noise.dashRadius, noise.landRadius];
  for (const radius of radii) {
    const made = { x: 24, y: 0, radius, at: 0 };
    const ring = pingRings(made, 0);
    assert.equal(canHear(24 + ring.boundary - 0.01, made), true);
    assert.equal(canHear(24 + ring.boundary + 0.01, made), false);
  }
  // Footsteps: the ring is centred on the player, the point the hearing check uses.
  const world = testWorld({ playerX: 20 });
  run(world, { moveX: 1, run: true }, 0.1);
  const steady = world.noises.find((entry) => entry.steady);
  assert.deepEqual([steady.x, steady.y, steady.radius], [world.player.x, world.player.y, world.noiseRadius]);
});

test('R8: a stunned guard\'s beam is drawn faint, because he cannot see', () => {
  assert.equal(beamStrength({ stun: 0 }), 1);
  assert.ok(beamStrength({ stun: 1.2 }) <= 0.3);
  const world = testWorld({ playerX: 21, guards: [sentry('g', 20)] });
  tap(world, 'shove');
  const guard = world.guards[0];
  assert.ok(guard.stun > 0);
  run(world, {}, 0.2);
  assert.equal(guard.seesPlayer, false, 'the rule');
  assert.ok(beamStrength(guard) < 1, 'and the picture agree');
});

// ---------- R11: how you got caught ----------

test('R11: the grabbing guard\'s own Alert is used, not the last alarm anywhere', () => {
  // Guard A sees you first. Much later guard B, who was alerted with him, is the one who grabs.
  const world = testWorld({ width: 120, playerX: 24, guards: [sentry('a', 20), sentry('b', 100, -1)] });
  const [a, b] = world.guards;
  runUntil(world, () => a.state === 'alert', {}, 4);
  const firstAlert = world.time;
  assert.ok(Math.abs(a.alertRecord.at - firstAlert) < 0.02);
  assert.equal(b.alertRecord.at, a.alertRecord.at, 'the alarm reached B at the same moment');
  // B loses you, calms right down, and is then alerted again on his own, later.
  Object.assign(a, down);
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => b.state === 'calm', {}, 60);
  world.player.hiddenIn = null;
  world.breakFreeUsed = true;
  world.solitary.used = true;
  runUntil(world, () => {
    world.player.x = b.x + b.facing * 1;
    return b.state === 'alert';
  }, {}, 6);
  const secondAlert = world.time;
  assert.ok(secondAlert - firstAlert > 4);
  assert.ok(Math.abs(b.alertRecord.at - secondAlert) < 0.02, 'his own record moved on');
  runUntil(world, () => world.over !== null, {}, 6);
  assert.equal(world.lastGrab.by, 'Test guard 2');
  assert.ok(Math.abs(world.lastGrab.sinceAlarm - (world.lastGrab.at - secondAlert)) < 0.02);
  assert.ok(world.lastGrab.sinceAlarm < 3, 'seconds from HIS "!", not from the first alarm of the run');
  const line = /^Grabbed by the Test guard 2 \d\.\d s after his "!"\. The Test guard 2 saw you/;
  assert.match(world.result.caughtHow, line);
});

test('R11: a re-alert inside one hunt updates the timing without counting a second spotting', () => {
  const wall = { id: 'w', kind: 'wall', x: 30, halfWidth: 0.5, bottom: 0, top: 4 };
  const world = testWorld({ width: 80, playerX: 24, guards: [sentry('g', 20)], solids: [wall] });
  const guard = world.guards[0];
  runUntil(world, () => guard.state === 'alert', {}, 4);
  const first = guard.alertRecord.at;
  world.player.x = 40;
  runUntil(world, () => guard.state === 'searching', {}, 12);
  runUntil(world, () => {
    world.player.x = Math.min(29, guard.x + guard.facing * 2.5);
    return guard.state === 'alert';
  }, {}, 6);
  assert.ok(guard.alertRecord.at > first + 2, 'his record is the new "!"');
  assert.equal(world.stats.timesSpotted, 1, 'the tally still says one hunt');
});

test('R11: a guard who chased you in from another room reports his own room and cause', () => {
  const world = prisonWorld('mess-hall', 34.5);
  const chaser = guardById(world, 'mh-guard-2');
  Object.assign(chaser, { x: 31, facing: 1, patrolDir: 1 });
  runUntil(world, () => chaser.state === 'alert', {}, 4);
  const record = { ...chaser.alertRecord };
  assert.equal(record.roomId, 'mess-hall');
  runUntil(world, () => world.room.id === 'stairwell', { moveX: 1, run: true }, 4);
  runUntil(world, () => chaser.roomId === 'stairwell', {}, 2);
  assert.deepEqual(chaser.alertRecord, record, 'following you through the door is the same Alert');
});

test('R11: the victory line matches the rank. Only a Ghost win says nobody knows', () => {
  assert.equal(outcomeText('win', 'ghost'), 'You have the keycard, and nobody knows.');
  assert.match(outcomeText('win', 'shadow'), /Nobody saw you, but/);
  assert.match(outcomeText('win', 'inmate'), /they know somebody was out/);
  for (const rank of ['shadow', 'inmate']) assert.doesNotMatch(outcomeText('win', rank), /nobody knows/);
  assert.equal(outcomeText('caught', 'caught'), 'Grabbed a second time.');
  assert.match(outcomeText('headcount', 'caught'), /empty when they counted/);
});

// ---------- R3: interrogation payoff ----------

test('R3: beside the grab choices, when his next check-in is due and who comes if he misses it', () => {
  const world = prisonWorld('mess-hall', 10.2);
  const guard = guardById(world, 'mh-guard-1');
  Object.assign(guard, { x: 11, facing: 1 });
  assert.deepEqual(holdInfo(world), [], 'nothing until you hold someone');
  tap(world, 'action');
  assert.equal(guard.state, 'held');
  const due = Math.ceil(guard.radioAt - world.time);
  assert.deepEqual(holdInfo(world), [
    `His next radio check-in is due in ${due} s.`,
    'Knocked out, he misses it and the Mess Hall guard 2 comes to look.',
    'Interrogate first and his code stops that.',
  ]);
  // One press of Q. The bar fills, he talks, the code is learned.
  tap(world, 'ask');
  run(world, {}, CONFIG.takedown.interrogateSeconds + 0.05);
  assert.equal(currentMessage(world), 'Radio code learned: his check-ins will be faked.');
  assert.equal(holdInfo(world)[1], 'You have his code: knocked out, his check-ins are faked.');
  // Knock him out and wait for the call: faked, and guard 2 stays on his patrol.
  tap(world, 'action');
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => happened(world, 'checkInFaked'), {}, 70);
  assert.match(currentMessage(world), /^Check-in faked/);
  assert.equal(guardById(world, 'mh-guard-2').state, 'calm', 'the responder never comes');
  assert.ok(!happened(world, 'missedCheckIn'));
});

test('R3: the office sleeper is not on the radio. That is said, and he gives up something else', () => {
  const world = prisonWorld('guard-office', 14.2);
  const sleeper = guardById(world, 'go-guard');
  tap(world, 'action');
  assert.deepEqual(holdInfo(world), [
    'Not on the radio: nobody expects to hear from him.', 'Interrogate him for what he knows instead.',
  ]);
  tap(world, 'ask');
  run(world, {}, CONFIG.takedown.interrogateSeconds + 0.05);
  assert.equal(sleeper.codeKnown, false, 'no code: it would do nothing');
  assert.match(currentMessage(world), /^He is not on the radio, so there is no code to learn/);
  assert.match(world.messageQueue[0].text, /^Secret learned: .*roof hatch.*window/);
  for (const id of ['yd-hatch', 'mh-yard', 'go-window']) assert.ok(world.knownPortals.has(id), `${id} is on the map`);
  assert.deepEqual(ROOMS['guard-office'].guards[0].talk.type, 'secret');
});
