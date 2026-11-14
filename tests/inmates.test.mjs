// Snitch inmates, the trader, and the camera control panel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { mapModel } from '../site/js/game/map.js';
import { currentMessage } from '../site/js/game/messages.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { ROOMS } from '../site/js/game/rooms.js';
import { snitchWindow } from '../site/js/game/snitch.js';
import { HINTS, nextHint } from '../site/js/game/trader.js';
import { eventTypes, guardById, prisonWorld, run, tap } from './helpers.mjs';

const S = CONFIG.snitch;
const snitch = (world, id = 'snitch-1') => world.snitches.find((entry) => entry.id === id);
// Snitch 1 is at x = 15 and looks right first.
const inHisView = () => prisonWorld('cell-block', 16);

test('there are snitches and one trader in the Cell Block', () => {
  assert.ok(ROOMS['cell-block'].snitches.length >= 2);
  assert.ok(ROOMS['cell-block'].trader);
});

test('a snitch has a small view to one side of his cell, with a blind spot at the bars', () => {
  const world = prisonWorld('cell-block', 2);
  const [from, to] = snitchWindow(snitch(world));
  assert.equal(from, 15 + S.blindSpot);
  assert.equal(to, 15 + S.range);
  assert.ok(to - from < CONFIG.guard.coneRange / 2, 'much smaller than a guard flashlight');
});

test('a snitch looks one way, then the other, on a fixed beat', () => {
  const world = prisonWorld('cell-block', 2);
  assert.equal(snitch(world).facing, 1);
  run(world, {}, S.lookSeconds + 0.1);
  assert.equal(snitch(world).facing, -1);
  assert.deepEqual(snitchWindow(snitch(world)), [15 - S.range, 15 - S.blindSpot]);
  run(world, {}, S.lookSeconds);
  assert.equal(snitch(world).facing, 1);
});

test('seen by a snitch: he yells, and the nearest guard goes Suspicious and walks to that spot', () => {
  const world = inHisView();
  const guard = guardById(world, 'cb-guard');
  Object.assign(guard, { x: 9.5, facing: -1, patrolDir: -1 });
  run(world, {}, S.noticeSeconds + 0.05);
  assert.ok(eventTypes(world).includes('yell'));
  assert.equal(guard.state, 'suspicious');
  assert.equal(guard.targetX, 16);
  assert.equal(world.stats.timesSpotted, 1);
  assert.match(currentMessage(world), /snitch yells/);
});

test('a snitch does not see you in his blind spot, on his other side, or in hiding', () => {
  const guardAway = (world) => Object.assign(guardById(world, 'cb-guard'), { x: 9.5, facing: -1, patrolDir: -1 });
  for (const x of [15, 15 + S.blindSpot - 0.1, 15 - 1.5, 15 + S.range + 0.2]) {
    const world = prisonWorld('cell-block', x);
    guardAway(world);
    run(world, {}, 1);
    assert.ok(!eventTypes(world).includes('yell'), `not seen at ${x}`);
  }
  const dark = prisonWorld('cell-block', 16.8);
  guardAway(dark);
  run(dark, {}, 1);
  assert.equal(dark.player.inDark, 'cb-dark');
  assert.ok(!eventTypes(dark).includes('yell'), 'standing still in the dark spot inside his view');
});

test('a snitch does not yell again straight away', () => {
  const world = inHisView();
  guardById(world, 'cb-guard').state = 'out';
  run(world, {}, 2);
  assert.equal(eventTypes(world).filter((type) => type === 'yell').length, 1);
});

test('without the keycard a snitch cell stays locked', () => {
  const world = prisonWorld('cell-block', 15);
  guardById(world, 'cb-guard').x = 21;
  assert.equal(currentPrompt(world).text, 'Snitch. His cell is locked');
  tap(world, 'up');
  assert.equal(snitch(world).cellOpen, false);
  assert.match(currentMessage(world), /keycard would open it/);
  tap(world, 'action');
  assert.equal(snitch(world).state, 'awake');
});

test('with the keycard you can open his cell and knock him out', () => {
  const world = prisonWorld('cell-block', 15);
  guardById(world, 'cb-guard').x = 9.5;
  world.player.hasKeycard = true;
  assert.equal(currentPrompt(world).text, 'UP: open his cell with the keycard');
  tap(world, 'action');
  assert.equal(snitch(world).state, 'awake', 'the cell has to be opened first');
  tap(world, 'up');
  assert.equal(snitch(world).cellOpen, true);
  assert.equal(currentPrompt(world).text, 'SPACE: knock out');
  tap(world, 'action');
  assert.equal(snitch(world).state, 'out');
  assert.equal(world.stats.knockouts, 1);

  world.player.x = 16;
  run(world, {}, 2);
  assert.ok(!eventTypes(world).includes('yell'), 'a knocked-out snitch sees nothing');
});

test('the cigarettes are in the Mess Hall kitchen corner', () => {
  const world = prisonWorld('mess-hall', 34.6);
  assert.equal(currentPrompt(world).text, 'E: take the cigarettes');
  tap(world, 'interact');
  assert.equal(world.player.hasCigarettes, true);
});

test('the trader asks for cigarettes if you have none', () => {
  const world = prisonWorld('cell-block', 8);
  assert.equal(currentPrompt(world).text, 'E: talk to the trader');
  tap(world, 'interact');
  assert.match(currentMessage(world), /Bring me smokes/);
  assert.equal(world.notes.length, 0);
});

test('the trader hints at the vents first, and puts them on your map', () => {
  const world = prisonWorld('cell-block', 8);
  world.player.hasCigarettes = true;
  assert.equal(nextHint(world).id, 'vents');
  assert.equal(currentPrompt(world).text, 'E: trade the cigarettes');
  tap(world, 'interact');
  assert.equal(world.player.hasCigarettes, false);
  assert.match(currentMessage(world), /screwdriver/);
  assert.equal(world.notes.length, 1);
  assert.ok(eventTypes(world).includes('hint'));
  assert.ok(mapModel(world).links.find((link) => link.type === 'vent' && link.known));
});

test('the trader picks the hint for whichever thing you have not found yet', () => {
  const foundVents = prisonWorld('cell-block', 8);
  foundVents.knownPortals.add('ma-vent');
  assert.equal(nextHint(foundVents).id, 'panel');

  const foundPanelToo = prisonWorld('maintenance', 21.1);
  foundPanelToo.knownPortals.add('ma-vent');
  run(foundPanelToo, {}, 0.1);
  assert.ok(foundPanelToo.found.has('ma-panel'), 'walking up to the panel counts as finding it');
  assert.equal(nextHint(foundPanelToo).id, 'drop');

  const foundAll = prisonWorld('cell-block', 8);
  foundAll.knownPortals.add('ma-vent');
  foundAll.knownPortals.add('go-drop');
  foundAll.found.add('ma-panel');
  assert.equal(nextHint(foundAll), null);
  foundAll.player.hasCigarettes = true;
  tap(foundAll, 'interact');
  assert.match(currentMessage(foundAll), /already know everything/);
  assert.deepEqual(HINTS.map((hint) => hint.id), ['vents', 'panel', 'drop']);
});

test('the trader only trades once', () => {
  const world = prisonWorld('cell-block', 8);
  world.player.hasCigarettes = true;
  tap(world, 'interact');
  tap(world, 'interact');
  assert.match(currentMessage(world), /all I have got/);
  assert.equal(world.notes.length, 1);
});

test('the camera control panel in Maintenance turns off the Stairwell camera', () => {
  const world = prisonWorld('maintenance', 21.1);
  const camera = world.cameras.find((entry) => entry.id === 'sw-camera');
  assert.equal(currentPrompt(world).text, 'E: camera control panel');
  tap(world, 'interact');
  assert.equal(camera.off, true);
  assert.equal(currentMessage(world), 'Stairwell camera: OFF');
  assert.equal(world.cameras.find((entry) => entry.id === 'ma-camera').off, false, 'only the Stairwell one');
});

test('with its camera off, walking through the Stairwell sweep is not seen', () => {
  const world = prisonWorld('stairwell', 16.5);
  world.cameras.find((entry) => entry.id === 'sw-camera').off = true;
  run(world, {}, 5);
  assert.equal(world.seenByCamera, false);
  assert.equal(world.stats.timesSpotted, 0);
  assert.equal(guardById(world, 'sw-guard').state, 'calm');
});
