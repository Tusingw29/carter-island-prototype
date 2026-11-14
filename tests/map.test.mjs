// The prison layout: rooms, how they connect, and the map screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { mapModel } from '../site/js/game/map.js';
import { findPortal, portalX } from '../site/js/game/portals.js';
import { PRISON, ROOMS } from '../site/js/game/rooms.js';
import { createWorld } from '../site/js/game/world.js';
import { forecast } from './bot/planner.mjs';
import { guardSeesPlayer } from '../site/js/game/vision.js';
import { run, runUntil, tap } from './helpers.mjs';

const rooms = Object.values(ROOMS);
const portals = rooms.flatMap((room) => (room.portals ?? []).map((portal) => ({ room, portal })));

// Rooms reachable from start using only the given portal types.
function reachable(start, types) {
  const found = new Set([start]);
  const queue = [start];
  while (queue.length) {
    for (const portal of ROOMS[queue.shift()].portals ?? []) {
      if (!types.includes(portal.type) || found.has(portal.to)) continue;
      found.add(portal.to);
      queue.push(portal.to);
    }
  }
  return found;
}

test('the prison has the six areas from the spec on three floors', () => {
  const byFloor = (floor) => rooms.filter((room) => room.floor === floor).map((room) => room.name).sort();
  assert.deepEqual(byFloor(1), ['Cell Block', 'Mess Hall', 'Stairwell Checkpoint']);
  assert.deepEqual(byFloor(0), ['Laundry', 'Maintenance Hall']);
  assert.ok(byFloor(2).includes('Guard Office'));
});

test('every portal leads to a real portal that leads straight back', () => {
  for (const { room, portal } of portals) {
    const other = findPortal(PRISON, portal.toPortal);
    assert.ok(other, `${portal.id} points at ${portal.toPortal}`);
    assert.equal(other.room.id, portal.to);
    if (!portal.oneWay) {
      assert.equal(other.portal.to, room.id, `${portal.toPortal} comes back to ${room.id}`);
      assert.equal(other.portal.toPortal, portal.id);
    }
  }
});

test('room connections match the spec map', () => {
  const link = (from, to) => (ROOMS[from].portals ?? []).find((portal) => portal.to === to);
  assert.equal(link('cell-block', 'mess-hall').type, 'hall');
  assert.equal(link('mess-hall', 'stairwell').type, 'hall');
  assert.equal(link('stairwell', 'guard-office').type, 'door');
  assert.equal(link('cell-block', 'laundry').type, 'stairs');
  assert.equal(link('laundry', 'maintenance').type, 'door');
  assert.equal(link('stairwell', 'guard-office').creaky, true, 'creaky door at the top of the stairwell');
  assert.equal(link('laundry', 'maintenance').creaky, true, 'creaky door to Maintenance');
});

test('every area can be reached on foot, with no tools', () => {
  const onFoot = reachable('cell-block', ['hall', 'door', 'stairs']);
  for (const id of ['laundry', 'maintenance', 'mess-hall', 'stairwell', 'guard-office']) assert.ok(onFoot.has(id), id);
});

test('each area has the guards, cameras, and hiding spots listed in the spec', () => {
  const count = (id, key, test = () => true) => (ROOMS[id][key] ?? []).filter(test).length;
  const patrols = (guard) => guard.patrol[0] !== guard.patrol[1];
  assert.equal(count('cell-block', 'guards', patrols), 1);
  assert.ok(count('cell-block', 'hideSpots', (s) => s.type === 'locker') >= 1);
  assert.equal(count('laundry', 'guards', patrols), 1);
  assert.ok(count('laundry', 'hideSpots', (s) => s.type === 'cart') >= 1);
  assert.equal(count('maintenance', 'guards'), 0);
  assert.equal(count('maintenance', 'cameras'), 1);
  assert.ok(count('maintenance', 'hideSpots', (s) => s.type === 'shelf') >= 1);
  assert.equal(count('mess-hall', 'guards', patrols), 2);
  assert.ok(count('mess-hall', 'hideSpots', (s) => s.type === 'table') >= 1);
  assert.equal(count('stairwell', 'guards', (g) => !patrols(g)), 1, 'one standing guard');
  assert.equal(count('stairwell', 'cameras'), 1);
  assert.equal(count('guard-office', 'guards', (g) => g.sleeper), 1, 'one sleeping guard');
  assert.equal(count('guard-office', 'hideSpots', (s) => s.type === 'desk'), 1);
  assert.equal(count('guard-office', 'items', (i) => i.type === 'keycard'), 1);
});

test('everything in a room sits inside its walls', () => {
  for (const room of rooms) {
    const xs = [
      ...(room.hideSpots ?? []).flatMap((s) => [s.x - (s.halfWidth ?? 0), s.x + (s.halfWidth ?? 0)]),
      ...(room.portals ?? []).filter((p) => p.type !== 'hall').map((p) => p.x),
      ...(room.guards ?? []).flatMap((g) => g.patrol),
      ...(room.items ?? []).map((i) => i.x),
    ];
    for (const x of xs) assert.ok(x >= -0.2 && x <= room.width + 0.2, `${room.id}: ${x}`);
  }
});

test('you never step into a room straight into a flashlight: every way in is unwatched or dark', () => {
  const frames = forecast(createWorld(), 120);
  for (const { room, portal } of portals) {
    const x = portalX(room, portal);
    const dark = (room.hideSpots ?? []).some((s) => s.type === 'dark' && Math.abs(s.x - x) < s.halfWidth);
    if (dark) continue;
    for (let tick = 0; tick < frames.length; tick += 12) {
      const guards = frames[tick].guards.filter((g) => g.roomId === room.id && g.state === 'calm');
      const player = { x, crouching: false, hiddenIn: null, inDark: null };
      assert.ok(!guards.some((guard) => guardSeesPlayer(guard, player)), `${portal.id} is watched at ${tick / 120}s`);
    }
  }
});

test('walking into a hall takes you to the next room and back', () => {
  const world = createWorld();
  world.player.hiddenIn = null;
  world.player.x = ROOMS['cell-block'].width - 1;
  runUntil(world, () => world.room.id === 'mess-hall', { moveX: 1, crouch: true }, 5);
  assert.ok(world.player.x < 2, 'you arrive at the west end of the Mess Hall');
  assert.equal(world.player.inDark, null);
  run(world, {}, 0.1);
  assert.equal(world.player.inDark, 'mh-dark-west', 'standing still in the dark archway');
  assert.deepEqual(world.guards.map((g) => g.id), ['mh-guard-1', 'mh-guard-2']);
  runUntil(world, () => world.room.id === 'cell-block', { moveX: -1, crouch: true }, 5);
  assert.ok(world.player.x > ROOMS['cell-block'].width - 2);
});

test('Up takes the stairs between the Cell Block and the Laundry', () => {
  const world = createWorld();
  world.player.hiddenIn = null;
  world.player.x = 1.3;
  tap(world, 'up');
  assert.equal(world.room.id, 'laundry');
  assert.equal(world.player.x, 2);
  tap(world, 'up');
  assert.equal(world.room.id, 'cell-block');
});

test('guards in other rooms keep patrolling, the same way every run', () => {
  const trace = () => {
    const world = createWorld();
    run(world, {}, 45);
    return world.allGuards.map((g) => [g.id, g.x, g.facing]);
  };
  const first = trace();
  assert.deepEqual(first, trace());
  const moved = first.filter(([id, x]) => x !== ROOMS.laundry.guards[0].startX && id === 'la-guard');
  assert.equal(moved.length, 1, 'the Laundry guard moved while you were in the Cell Block');
});

test('the map fills in as you explore', () => {
  const world = createWorld();
  const visited = () => mapModel(world).rooms.filter((room) => room.visited).map((room) => room.id);
  const known = () => mapModel(world).links.filter((link) => link.known).map((link) => `${link.from}>${link.to}`);
  assert.deepEqual(visited(), ['cell-block']);
  assert.deepEqual(known().sort(), ['cell-block>laundry', 'cell-block>mess-hall']);
  assert.equal(mapModel(world).rooms.find((room) => room.current).id, 'cell-block');

  world.player.hiddenIn = null;
  world.player.x = 1.3;
  tap(world, 'up');
  assert.deepEqual(visited().sort(), ['cell-block', 'laundry']);
  assert.ok(known().includes('laundry>maintenance'), 'you can see the door to Maintenance from the Laundry');
  assert.equal(mapModel(world).rooms.find((room) => room.current).id, 'laundry');
  assert.ok(!visited().includes('guard-office'));
});

test('the map places rooms on three floors', () => {
  const model = mapModel(createWorld());
  assert.deepEqual([...new Set(model.rooms.map((room) => room.floor))].sort(), [0, 1, 2]);
  assert.equal(model.links.length, 5);
  assert.ok(CONFIG.headcountSeconds > 0);
});
