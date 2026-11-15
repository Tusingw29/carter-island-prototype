// Proves the game can be finished cleanly, and measures how long that takes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { formatClock } from '../site/js/game/clock.js';
import { frontDoorRun, frontDoorThenDropRun, ventRun } from './bot/routes.mjs';
import { bootsThenRoofByHoopRun, bootsThenRoofByTowerRun, bootsTrip } from './bot/yard-routes.mjs';

function report(name, { log, seconds }) {
  const legs = log.map((leg) => `    ${leg.room.padEnd(48)} ${leg.seconds.toFixed(1).padStart(5)} s`).join('\n');
  console.log(`\n  ${name}: ${formatClock(seconds)} (${seconds.toFixed(1)} s)\n${legs}\n`);
}

test('front door route: a Ghost run is possible, well inside the timer', () => {
  const result = frontDoorRun();
  report('Clean front-door run (bot, perfect timing)', result);
  const { world } = result;
  assert.equal(world.over, 'win');
  assert.equal(world.result.rank, 'ghost');
  assert.equal(world.stats.timesSpotted, 0);
  assert.equal(world.keycardGrab, 'slow');
  assert.equal(world.silentAlarm, false);
  assert.ok(world.allGuards.every((guard) => guard.state === 'calm' || guard.state === 'asleep'));
  assert.ok(result.seconds < CONFIG.headcountSeconds / 2, 'a perfect run leaves plenty of room for mistakes');
});

function assertGhost({ world }) {
  assert.equal(world.over, 'win');
  assert.equal(world.result.rank, 'ghost');
  assert.equal(world.silentAlarm, false);
  assert.ok(world.allGuards.every((guard) => guard.state === 'calm' || guard.state === 'asleep'));
}

test('front door in, one-way drop home: a Ghost run with no tools', () => {
  const result = frontDoorThenDropRun();
  report('Clean front door in, drop home (bot, perfect timing)', result);
  assertGhost(result);
  assert.equal(result.world.player.hasScrewdriver, false);
  assert.ok(result.seconds < frontDoorRun().seconds, 'the drop is a faster way home than walking back');
});

test('vent route: a Ghost run through the Laundry, Maintenance, and the duct', () => {
  const result = ventRun();
  report('Clean vent run (bot, perfect timing)', result);
  assertGhost(result);
  assert.equal(result.world.player.hasScrewdriver, true);
  const visited = [...result.world.visited];
  assert.ok(!visited.includes('mess-hall') && !visited.includes('stairwell'), 'it skips the guarded rooms');
  assert.ok(result.seconds < CONFIG.headcountSeconds / 2);
});

// ---------- The Yard (Step 11) ----------

test('yard: the work boots can be fetched without being noticed, with jumps only', () => {
  const result = bootsTrip();
  report('Bed to the work boots (bot)', result);
  const { world } = result;
  assert.equal(world.player.hasBoots, true);
  assert.equal(world.room.id, 'yard');
  assert.deepEqual([world.stats.timesSpotted, world.stats.knockouts, world.stats.bodiesFound], [0, 0, 0]);
  assert.ok(world.allGuards.every((guard) => guard.state === 'calm' || guard.state === 'asleep'));
  assert.ok(!world.events.some((event) => event.type === 'dash'), 'no dash on the way there');
});

test('yard roof route: boots, then the hoop climb to the roof, is a Ghost run inside 7:00', () => {
  const result = bootsThenRoofByHoopRun();
  report('Boots, hoop climb, roof, window, drop home (bot)', result);
  assertGhost(result);
  assert.equal(result.world.player.hasBoots, true);
  assert.ok([...result.world.knownPortals].includes('yd-window'), 'in through the window');
  assert.ok(result.world.visitedParts.has('yard-roof'));
  const visited = [...result.world.visited];
  assert.ok(!visited.includes('stairwell'), 'it never goes near the Stairwell');
  assert.ok(result.seconds < CONFIG.headcountSeconds, `${result.seconds} s fits in the timer`);
});

test('yard roof route: boots, then Tower 1 with its guard knocked out, fits inside 7:00', () => {
  const result = bootsThenRoofByTowerRun();
  report('Boots, Tower 1 (one knockout), roof, window, drop home (bot)', result);
  const { world } = result;
  assert.equal(world.over, 'win');
  assert.equal(world.result.rank, 'shadow', 'never spotted, one knockout');
  assert.deepEqual([world.stats.timesSpotted, world.stats.knockouts, world.stats.bodiesFound], [0, 1, 0]);
  assert.equal(world.stats.takedowns.choke, 1, 'grabbed from behind and choked out');
  assert.equal(world.cameras.find((camera) => camera.id === 'yd-light-1').off, true, 'his searchlight is out');
  assert.equal(world.silentAlarm, false);
  assert.ok(result.seconds < CONFIG.headcountSeconds);
});
