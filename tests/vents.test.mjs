// The screwdriver, vent covers, the duct crawl, the one-way drop, and the welded vent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { mapModel } from '../site/js/game/map.js';
import { currentMessage } from '../site/js/game/messages.js';
import { currentPrompt } from '../site/js/game/prompts.js';
import { ROOMS } from '../site/js/game/rooms.js';
import { peek, VENT_MESSAGES, ventState } from '../site/js/game/vents.js';
import { eventTypes, guardById, prisonWorld, run, runUntil, tap } from './helpers.mjs';

const ventLink = (world, a, b) => mapModel(world).links.find((link) => (
  link.type === 'vent' && [link.from, link.to].includes(a) && [link.from, link.to].includes(b)
));

test('the screwdriver is in the Laundry and Interact picks it up', () => {
  assert.ok(ROOMS.laundry.items.some((item) => item.type === 'screwdriver'));
  const world = prisonWorld('laundry', 23.8);
  assert.equal(currentPrompt(world).text, 'E: take the screwdriver');
  tap(world, 'interact');
  assert.equal(world.player.hasScrewdriver, true);
  assert.ok(eventTypes(world).includes('pickup'));
  assert.match(currentMessage(world), /Screwdriver/);
  assert.equal(currentPrompt(world), null, 'it is gone from the room');
});

test('a vent cover will not open without the screwdriver, and says so', () => {
  const world = prisonWorld('maintenance', 23);
  assert.equal(ventState(world, ROOMS.maintenance.portals[1]), 'locked');
  assert.equal(currentPrompt(world).text, 'Vent cover, screwed shut');
  tap(world, 'up');
  assert.equal(world.room.id, 'maintenance');
  assert.equal(currentMessage(world), VENT_MESSAGES.locked);
  assert.ok(eventTypes(world).includes('locked'));
});

test('with the screwdriver the same vent opens', () => {
  const world = prisonWorld('maintenance', 23);
  world.player.hasScrewdriver = true;
  assert.equal(currentPrompt(world).text, 'UP: climb into the vent');
  tap(world, 'up');
  assert.equal(world.room.id, 'vent-duct');
  assert.equal(world.player.x, 1.5);
});

test('messages clear after a few seconds', () => {
  const world = prisonWorld('maintenance', 23);
  tap(world, 'up');
  run(world, {}, CONFIG.messageSeconds + 0.1);
  assert.equal(currentMessage(world), null);
});

test('the welded vent cannot be opened, with or without the screwdriver', () => {
  const world = prisonWorld('maintenance', 19.5);
  world.player.hasScrewdriver = true;
  assert.equal(currentPrompt(world).text, 'Vent cover, welded');
  tap(world, 'up');
  assert.equal(world.room.id, 'maintenance');
  assert.equal(currentMessage(world), "Welded shut. You'll need something stronger.");
});

test('crawling in the duct is slow and silent, and you cannot run or stand', () => {
  const world = prisonWorld('vent-duct', 5);
  run(world, { moveX: 1, run: true }, 1);
  assert.ok(Math.abs(world.player.x - (5 + CONFIG.player.crouchSpeed)) < 0.01, 'running is ignored');
  assert.equal(world.player.crouching, true);
  assert.equal(world.noiseRadius, 0);
  run(world, { moveX: 1 }, 1);
  assert.ok(Math.abs(world.player.x - (5 + 2 * CONFIG.player.crouchSpeed)) < 0.01);
  assert.equal(world.noiseRadius, 0);
});

test('the crawl path: Maintenance vent, along the duct, drop into the Guard Office', () => {
  const world = prisonWorld('maintenance', 23);
  world.player.hasScrewdriver = true;
  tap(world, 'up');
  const crawlStart = world.time;
  runUntil(world, () => world.player.x >= 28.5 - 0.5, { moveX: 1 }, 30);
  assert.ok(world.time - crawlStart > 15, 'it is a slow crawl');
  assert.match(currentPrompt(world).text, /drop down \(one way\)/);
  tap(world, 'up');
  assert.equal(world.room.id, 'guard-office');
  assert.equal(world.player.x, 17.5);
  run(world, {}, 0.5);
  assert.equal(guardById(world, 'go-guard').stirTimer, 0, 'the landing does not wake the guard');
});

test('the duct has no guards', () => {
  assert.equal(ROOMS['vent-duct'].guards.length, 0);
});

test('you cannot climb back up into the duct from the Guard Office', () => {
  const world = prisonWorld('guard-office', 17.5);
  world.player.hasScrewdriver = true;
  tap(world, 'up');
  assert.equal(world.room.id, 'guard-office');
  assert.equal(currentMessage(world), VENT_MESSAGES.tooHigh);
});

test('you can go back down the duct to Maintenance', () => {
  const world = prisonWorld('vent-duct', 1.5);
  world.player.hasScrewdriver = true;
  tap(world, 'up');
  assert.equal(world.room.id, 'maintenance');
});

test('the one-way drop: from the Guard Office straight down to the Cell Block, no tool needed', () => {
  const world = prisonWorld('guard-office', 19.5);
  assert.equal(world.player.hasScrewdriver, false);
  assert.match(currentPrompt(world).text, /drop down \(one way\)/);
  tap(world, 'up');
  assert.equal(world.room.id, 'cell-block');
  assert.equal(world.player.x, 28.6);
  run(world, {}, 0.2);
  assert.equal(world.player.inDark, 'cb-dark-east', 'you land in the dark archway');
  assert.equal(guardById(world, 'cb-guard').state, 'calm');
});

test('the one-way drop cannot be opened from the Cell Block side, even with the screwdriver', () => {
  const world = prisonWorld('cell-block', 28.6);
  world.player.hasScrewdriver = true;
  assert.equal(currentPrompt(world).text, 'Vent cover');
  tap(world, 'up');
  assert.equal(world.room.id, 'cell-block');
  assert.equal(currentMessage(world), VENT_MESSAGES.exitOnly);
});

test('vents stay off the map until you walk up to them', () => {
  const world = prisonWorld('maintenance', 10);
  assert.equal(ventLink(world, 'maintenance', 'vent-duct').known, false);
  world.player.x = 23;
  run(world, {}, 0.1);
  assert.equal(ventLink(world, 'maintenance', 'vent-duct').known, true, 'found, even though it is locked');
  assert.equal(ventLink(world, 'vent-duct', 'guard-office').known, false);
});

test('using the drop puts it on the map', () => {
  const world = prisonWorld('guard-office', 10);
  assert.equal(ventLink(world, 'guard-office', 'cell-block').known, false);
  world.player.x = 19.5;
  tap(world, 'up');
  assert.equal(ventLink(world, 'guard-office', 'cell-block').known, true);
  assert.ok(mapModel(world).rooms.find((room) => room.id === 'cell-block').current);
});

test('vent grates let you look down at the guards below', () => {
  const world = prisonWorld('vent-duct', 3);
  assert.equal(peek(world), null, 'nothing to see away from a grate');
  world.player.x = 9;
  const view = peek(world);
  assert.equal(view.name, 'Mess Hall');
  assert.deepEqual(view.guards.map((guard) => guard.id), ['mh-guard-1', 'mh-guard-2']);
  const before = view.guards[0].x;
  run(world, {}, 2);
  assert.notEqual(peek(world).guards[0].x, before, 'it is live: the guards keep moving');
  world.player.x = 25.5;
  assert.equal(peek(world).name, 'Guard Office');
  assert.equal(peek(world).guards[0].state, 'asleep');
});
