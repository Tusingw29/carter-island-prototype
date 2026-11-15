// Step 13: lit or hidden at a glance, "last seen" markers, and solitary instead of restarting.
import test from 'node:test';
import assert from 'node:assert/strict';
import { shownState } from '../site/js/game/alert.js';
import { CONFIG } from '../site/js/game/config.js';
import { lastSeenMarkers } from '../site/js/game/lastseen.js';
import { litAreaAt } from '../site/js/game/lights.js';
import { mapModel } from '../site/js/game/map.js';
import { currentMessage } from '../site/js/game/messages.js';
import { playtestText } from '../site/js/game/playtest.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { GYM, PRISON, ROOMS } from '../site/js/game/rooms.js';
import { rankFor } from '../site/js/game/run.js';
import { solitaryFade } from '../site/js/game/solitary.js';
import { playerLook, playerVisibility } from '../site/js/game/visibility.js';
import { createWorld, stepWorld } from '../site/js/game/world.js';
import {
  STEP, eventTypes, guardById, intent, prisonWorld, run, runUntil, tap, testWorld,
} from './helpers.mjs';

const sentry = (id, x, facing = 1) => ({ id, patrol: [x, x], startX: x, facing });
const happened = (world, type) => eventTypes(world).includes(type);

// ---------- A. Lit or hidden ----------

// What the game's own senses decided on the last step: is anything looking at the player?
function rulesSayVisible(world) {
  const here = (thing) => thing.roomId === world.room.id;
  const { player, room } = world;
  const concealed = Boolean(player.hiddenIn || player.inDark || player.escorted);
  return world.guards.some((guard) => guard.seesPlayer)
    || world.cameras.some((camera) => here(camera) && camera.sees)
    || world.snitches.some((snitch) => here(snitch) && snitch.sees)
    || (!concealed && Boolean(litAreaAt(room, player)));
}

test('look: it always matches what the guards, cameras, and snitches decided, in every room', () => {
  let checked = 0;
  let disagreed = 0;
  const looks = new Set();
  for (const layout of [PRISON, GYM]) {
    for (const room of Object.values(layout.rooms)) {
      const world = createWorld(layout);
      world.player.hiddenIn = null;
      if (layout === PRISON) Object.assign(world, prisonWorld(room.id, 1));
      // Walk the length of the room and back, stopping now and then, crouching on the way back.
      const legs = [
        [{ moveX: 1 }, 14], [{}, 1.5], [{ moveX: 1, run: true }, 6], [{ moveX: -1, crouch: true }, 12], [{}, 2],
      ];
      for (const [keys, seconds] of legs) {
        for (let i = 0; i < seconds / STEP && !world.over && !world.grab; i += 1) {
          stepWorld(world, intent(keys), STEP);
          if (world.room.id !== room.id || world.grab || world.over || world.solitary.phase) break;
          const look = playerLook(world);
          looks.add(look);
          checked += 1;
          // The look is worked out for this very moment. A guard's senses run just before he
          // moves, so on the step he turns round they are one step behind it. Never two.
          disagreed = (look === 'visible') === rulesSayVisible(world) ? 0 : disagreed + 1;
          assert.ok(disagreed < 2, `${room.id} at x ${world.player.x.toFixed(2)}: the look says ${look}`);
        }
      }
    }
  }
  assert.ok(checked > 20000, `${checked} moments compared`);
  assert.deepEqual([...looks].sort(), ['hidden', 'visible'], 'both looks came up');
});

test('look: hidden in a dark spot, in shadow behind cover, inside a hiding spot, or out of every light', () => {
  const dark = { id: 'd', type: 'dark', x: 24, halfWidth: 1 };
  const locker = { id: 'locker', type: 'locker', x: 23 };
  const crate = { id: 'c', kind: 'crate', x: 22.5, halfWidth: 0.5, bottom: 0, top: 2.4 };
  // In his flashlight: visible.
  const seen = testWorld({ playerX: 24, guards: [sentry('g', 20)] });
  assert.equal(playerLook(seen), 'visible');
  assert.deepEqual(playerVisibility(seen).seenBy, [{ kind: 'guard', id: 'g' }]);
  // The same spot is a dark patch, and you stand still: hidden. Move and you are not.
  const inDark = testWorld({ playerX: 24, guards: [sentry('g', 20)], hideSpots: [dark] });
  run(inDark, {}, 0.05);
  assert.equal(playerLook(inDark), 'hidden');
  run(inDark, { moveX: 1, crouch: true }, 0.05);
  assert.equal(playerLook(inDark), 'visible');
  // Behind a tall crate: hidden. Inside a locker: hidden. Behind his back: hidden.
  assert.equal(playerLook(testWorld({ playerX: 24, guards: [sentry('g', 20)], solids: [crate] })), 'hidden');
  const inLocker = testWorld({ playerX: 23, guards: [sentry('g', 20)], hideSpots: [locker] });
  tap(inLocker, 'up');
  assert.equal(playerLook(inLocker), 'hidden');
  assert.equal(playerLook(testWorld({ playerX: 16, guards: [sentry('g', 20)] })), 'hidden');
});

test('look: a camera view and a searchlight pool both make you visible', () => {
  const camera = { id: 'cam', min: 10, max: 20, halfWidth: 3, speed: 0 };
  const watched = testWorld({ playerX: 11, cameras: [camera] });
  run(watched, {}, 0.02);
  assert.equal(playerLook(watched), 'visible');
  assert.equal(playerLook(testWorld({ playerX: 30, cameras: [camera] })), 'hidden');
  // The Yard: on the open court with the light on you, and in the bench's shadow beside it.
  const yard = prisonWorld('yard', 18);
  for (const guard of yard.guards) guard.state = 'out';
  const lamp = yard.cameras.find((entry) => entry.id === 'yd-light-1');
  Object.assign(lamp, { min: 16, max: 16, speed: 0, awaySeconds: 0 });
  yard.cameras.find((entry) => entry.id === 'yd-light-2').off = true;
  run(yard, {}, 0.02);
  assert.equal(playerLook(yard), 'visible');
  assert.equal(playerVisibility(yard).seenBy[0].kind, 'searchlight');
  yard.player.x = 12.2;
  assert.equal(playerLook(yard), 'hidden', 'behind the bench');
});

test('lit areas: under a lamp you show as visible even with nobody looking', () => {
  const office = prisonWorld('guard-office', 10.5);
  assert.equal(guardById(office, 'go-guard').state, 'asleep');
  assert.deepEqual(playerVisibility(office), { lit: true, seenBy: [], visible: true });
  office.player.x = 4;
  assert.equal(playerLook(office), 'hidden', 'away from the desk lamp the office is dark');
  // Under the desk, in the lamp's light: hidden.
  office.player.x = 10.5;
  tap(office, 'up');
  assert.equal(office.player.hiddenIn, 'go-desk');
  assert.equal(playerLook(office), 'hidden');
});

test('lit areas: there are a few, where it makes sense, and none overlaps a dark patch', () => {
  const lit = Object.values(ROOMS).flatMap((room) => (room.lights ?? []).map((light) => ({ room, light })));
  assert.ok(lit.length >= 3);
  assert.ok(ROOMS['guard-office'].lights.some((light) => Math.abs(light.x - 10.5) < 0.1), 'the desk lamp');
  for (const { room, light } of lit) {
    for (const spot of (room.hideSpots ?? []).filter((entry) => entry.type === 'dark')) {
      const gap = Math.abs(spot.x - light.x) - spot.halfWidth - light.halfWidth;
      assert.ok(gap >= 0, `${light.id} and ${spot.id} overlap`);
    }
  }
});

test('lit areas: in the light a guard is sure at once, however far away he is', () => {
  const lamp = { id: 'lamp', x: 26, halfWidth: 1 };
  const dim = testWorld({ playerX: 26, guards: [sentry('g', 20)] });
  const bright = testWorld({ playerX: 26, guards: [sentry('g', 20)], lights: [lamp] });
  const slow = runUntil(dim, () => dim.guards[0].state === 'alert', {}, 3);
  const fast = runUntil(bright, () => bright.guards[0].state === 'alert', {}, 3);
  assert.ok(slow > 0.7, `6 m away in the dim: ${slow} s`);
  assert.ok(fast <= CONFIG.guard.detectNearSeconds + 0.05, `under the lamp: ${fast} s`);
  assert.ok(slow > fast * 2.5);
});

// ---------- B. Last seen ----------

// A guard at 20 chasing a player who then gets out of his sight behind a tall wall.
function hunted() {
  const wall = { id: 'w', kind: 'wall', x: 30, halfWidth: 0.5, bottom: 0, top: 4 };
  const world = testWorld({ width: 80, playerX: 24, guards: [sentry('g', 20), sentry('far', 70, 1)], solids: [wall] });
  runUntil(world, () => world.guards[0].state === 'alert', {}, 3);
  return world;
}

test('last seen: no marker while he can see you, one at his last known position once he cannot', () => {
  const world = hunted();
  const [guard] = world.guards;
  assert.deepEqual(lastSeenMarkers(world).filter((marker) => marker.guardId === 'g'), [], 'he can see you');
  // Jump the wall? No: just vanish from his sight.
  world.player.x = 34;
  run(world, {}, CONFIG.guard.trackSeconds + 0.3);
  assert.equal(guard.seesPlayer, false);
  const marker = lastSeenMarkers(world).find((entry) => entry.guardId === 'g');
  assert.ok(marker, 'a marker for the guard who lost you');
  assert.equal(marker.x, guard.lastKnownX, 'at the spot he thinks you are');
  // Move on, still out of his sight: the marker stays where he last knew you were.
  world.player.x = 40;
  run(world, {}, 0.2);
  const later = lastSeenMarkers(world).find((entry) => entry.guardId === 'g');
  assert.equal(later.x, marker.x);
  assert.ok(Math.abs(later.x - world.player.x) > 5, 'which is not where you are');
});

test('last seen: one marker per hunting guard, each at that guard\'s own belief', () => {
  const world = hunted();
  world.player.x = 34;
  run(world, {}, 1.5);
  const [near, far] = world.guards;
  assert.equal(far.state, 'alert', 'the alarm reached the other guard too');
  const markers = lastSeenMarkers(world);
  assert.deepEqual(markers.map((marker) => marker.guardId).sort(), ['far', 'g']);
  far.lastKnownX = 50;
  const moved = lastSeenMarkers(world);
  assert.equal(moved.find((marker) => marker.guardId === 'far').x, 50);
  assert.equal(moved.find((marker) => marker.guardId === 'g').x, near.lastKnownX);
});

test('last seen: it follows him into Searching, moves when a noise moves his search, and goes on Calm', () => {
  const world = hunted();
  const [guard] = world.guards;
  world.player.x = 34;
  world.player.hiddenIn = 'elsewhere';
  runUntil(world, () => guard.state === 'searching', {}, 8);
  const searching = lastSeenMarkers(world).find((entry) => entry.guardId === 'g');
  assert.equal(searching.x, guard.searchOrigin, 'the middle of his search');
  // A loud noise somewhere else: he goes to look, and the marker goes with him.
  world.pendingNoises.push({ x: 12, radius: 30 });
  run(world, {}, 0.1);
  assert.equal(guard.state, 'suspicious');
  assert.equal(lastSeenMarkers(world).find((entry) => entry.guardId === 'g').x, 12);
  // He finds nothing and calms down: no marker.
  runUntil(world, () => guard.state === 'calm', {}, 30);
  assert.deepEqual(lastSeenMarkers(world).filter((entry) => entry.guardId === 'g'), []);
});

test('last seen: a guard who is only Suspicious, and was never hunting, has no marker', () => {
  const world = testWorld({ playerX: 2, guards: [sentry('g', 20)] });
  world.player.hiddenIn = 'elsewhere';
  world.pendingNoises.push({ x: 14, radius: 8 });
  run(world, {}, 0.1);
  assert.equal(world.guards[0].state, 'suspicious');
  assert.deepEqual(lastSeenMarkers(world), []);
});

// ---------- C. Solitary ----------

const S = CONFIG.solitary;

// In the Mess Hall with a guard right on top of the player, tools in hand, and the mash lost.
function caughtOnce() {
  const world = prisonWorld('mess-hall', 12);
  Object.assign(world.player, {
    hasKeycard: true, hasScrewdriver: true, hasBoots: true, carrying: { id: 'mh-cup-1', type: 'cup' },
  });
  world.keycardGrab = 'fast';
  const guard = guardById(world, 'mh-guard-1');
  Object.assign(guard, { x: 11.4, facing: 1 });
  runUntil(world, () => world.grab !== null, {}, 5);
  const timeLeft = world.timeLeft;
  // Do not mash: the grab runs out.
  runUntil(world, () => world.grab === null, {}, CONFIG.grab.mashSeconds + 1);
  return { world, timeLeft };
}

test('solitary: the first capture does not end the run. You wake in the solitary cell', () => {
  const { world } = caughtOnce();
  assert.equal(world.over, null);
  assert.equal(world.room.id, 'solitary');
  assert.equal(world.solitary.used, true);
  assert.ok(happened(world, 'solitary'));
  assert.match(currentMessage(world), /^SOLITARY/);
  assert.equal(solitaryFade(world), 1, 'the screen is black');
  run(world, {}, S.fadeSeconds + 0.1);
  assert.equal(solitaryFade(world), 0, 'and comes back up');
});

test('solitary: the timer loses 60 seconds', () => {
  assert.equal(S.penaltySeconds, 60);
  const { world, timeLeft } = caughtOnce();
  const mash = CONFIG.grab.mashSeconds;
  assert.ok(Math.abs(timeLeft - world.timeLeft - 60 - mash) < 0.1, 'sixty seconds, on top of the grab itself');
  assert.equal(world.solitary.penalty, 60);
});

test('solitary: the keycard goes back to the desk and what you carried is taken. Unlocks are kept', () => {
  const { world } = caughtOnce();
  const { player } = world;
  assert.equal(player.hasKeycard, false);
  assert.equal(world.keycardGrab, null);
  assert.equal(player.carrying, null);
  assert.equal(player.hasScrewdriver, true, 'the screwdriver is kept');
  assert.equal(player.hasBoots, true, 'the work boots are kept');
  // The keycard can be taken from the desk again.
  const again = prisonWorld('guard-office', 10.5);
  again.solitary = { ...world.solitary, phase: null };
  again.player.hasKeycard = false;
  run(again, { interact: true }, CONFIG.hold.slowSeconds + 0.2);
  assert.equal(again.player.hasKeycard, true);
});

test('solitary: after a few seconds a guard walks you back to your own cell and you are put in bed', () => {
  const { world } = caughtOnce();
  run(world, { moveX: 1, run: true, action: true }, S.cellSeconds - 0.2);
  assert.equal(world.room.id, 'solitary', 'still in the cell, and the buttons do nothing');
  run(world, {}, 0.4);
  assert.equal(world.room.id, 'cell-block', 'the door is opened');
  assert.equal(world.solitary.phase, 'walk');
  const from = world.player.x;
  run(world, { moveX: 1, run: true }, 1);
  assert.ok(world.player.x < from, 'you are walked toward your bed whatever you press');
  runUntil(world, () => world.solitary.phase === null, {}, 10);
  assert.equal(world.player.hiddenIn, 'bed');
  assert.equal(world.over, null);
  assert.equal(world.grab, null);
  assert.equal(world.stats.timesSpotted <= 2, true);
  // And then the game is yours again.
  tap(world, 'up');
  assert.equal(world.player.hiddenIn, null);
});

test('solitary: nobody sees or grabs you on the walk back, and E skips it', () => {
  const { world } = caughtOnce();
  const spotted = world.stats.timesSpotted;
  world.events.length = 0;
  runUntil(world, () => {
    if (world.solitary.phase === null) return true;
    assert.equal(currentPrompt(world), null, 'no button hints during the trip');
    return false;
  }, {}, 15);
  assert.equal(world.stats.timesSpotted, spotted);
  assert.ok(!happened(world, 'glance') && !happened(world, 'suspicious'), 'and nobody hears your footsteps');
  assert.ok(world.allGuards.every((guard) => guard.state !== 'alert'));
  const skipped = caughtOnce().world;
  tap(skipped, 'interact');
  assert.equal(skipped.solitary.phase, null);
  assert.equal(skipped.room.id, 'cell-block');
  assert.equal(skipped.player.hiddenIn, 'bed');
  assert.equal(skipped.over, null, 'skipping does not also press Sleep');
});

test('solitary: every guard stays wary for the rest of the run, and the break-free chance comes back', () => {
  const { world } = caughtOnce();
  const onDuty = world.allGuards.filter((guard) => !guard.sleeper && guard.state !== 'out');
  assert.ok(onDuty.every((guard) => guard.wary && shownState(guard) === 'suspicious'));
  assert.equal(world.breakFreeUsed, false);
  runUntil(world, () => world.solitary.phase === null, {}, 15);
  run(world, {}, 60);
  assert.ok(onDuty.every((guard) => guard.wary), 'still wary a minute later');
});

test('solitary: mash free of the next grab, and the capture after that ends the run', () => {
  const { world } = caughtOnce();
  tap(world, 'interact');
  tap(world, 'up');
  const guard = guardById(world, 'cb-guard');
  // Walk into the Cell Block guard.
  const post = world.player.x + 1;
  const standing = { x: post, patrolMin: post, patrolMax: post, facing: -1, postFacing: -1 };
  Object.assign(guard, standing, { state: 'calm', duty: null });
  runUntil(world, () => world.grab !== null, {}, 6);
  for (let i = 0; i < CONFIG.grab.mashNeeded; i += 1) tap(world, 'action');
  assert.equal(world.grab, null, 'the one mash-to-escape is back');
  assert.equal(world.breakFreeUsed, true);
  assert.equal(world.over, null);
  Object.assign(guard, { x: world.player.x + 0.5, stun: 0 });
  world.grabImmunity = 0;
  runUntil(world, () => world.over !== null, {}, 8);
  assert.equal(world.over, 'caught');
  assert.equal(world.room.id, 'cell-block', 'no second trip to solitary');
});

test('solitary: a run with a trip can still be won, but only as Inmate', () => {
  assert.equal(rankFor({ won: true, timesSpotted: 0, knockouts: 0, solitary: true }), 'inmate');
  assert.equal(rankFor({ won: true, timesSpotted: 0, knockouts: 0, solitary: false }), 'ghost');
  assert.equal(rankFor({ won: false, timesSpotted: 0, knockouts: 0, solitary: true }), 'caught');
  const { world } = caughtOnce();
  tap(world, 'interact');
  world.player.hasKeycard = true;
  world.stats.timesSpotted = 0;
  tap(world, 'interact');
  assert.equal(world.over, 'win');
  assert.equal(world.result.rank, 'inmate');
  assert.equal(world.result.solitary, true);
  assert.equal(world.result.solitaryPenalty, 60);
  assert.match(playtestText(world.result, []), /Solitary: yes, 60 s lost\./);
  const clean = createWorld();
  clean.over = 'win';
  assert.match(playtestText({ ...clean.result, won: true, rank: 'ghost', solitary: false }, []), /Solitary: no\./);
});

test('solitary: the cell is on the map once you have been there, next to the Cell Block', () => {
  const fresh = mapModel(createWorld());
  assert.equal(fresh.rooms.find((room) => room.id === 'solitary').visited, false);
  assert.equal(fresh.links.find((link) => link.to === 'solitary' || link.from === 'solitary').known, false);
  const { world } = caughtOnce();
  const model = mapModel(world);
  const cell = model.rooms.find((room) => room.id === 'solitary');
  const block = model.rooms.find((room) => room.id === 'cell-block');
  assert.equal(cell.visited, true);
  assert.equal(cell.current, true);
  assert.deepEqual([cell.floor, block.col - cell.col], [block.floor, 1], 'the next box along on the same floor');
  assert.equal(model.links.find((link) => link.to === 'solitary' || link.from === 'solitary').known, true);
});

test('solitary: the door is never yours to open, and a bed check while you are away is not held against you', () => {
  const world = prisonWorld('cell-block', 19.9);
  for (const guard of world.allGuards) guard.state = 'out';
  tap(world, 'up');
  assert.equal(world.room.id, 'cell-block');
  assert.match(currentMessage(world), /Locked/);
  const away = caughtOnce().world;
  away.timeLeft = CONFIG.bedCheckAtSecondsRemaining + 0.5;
  away.solitary.timer = 30;
  runUntil(away, () => away.bedCheck?.result, {}, 40);
  assert.equal(away.bedCheck.result, 'skipped');
  assert.ok(!happened(away, 'lockdown'));
});
