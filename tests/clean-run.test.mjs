// Proves the game can be finished cleanly, and measures how long that takes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { formatClock } from '../site/js/game/clock.js';
import { frontDoorRun } from './bot/routes.mjs';

function report(name, { log, seconds }) {
  const legs = log.map((leg) => `    ${leg.room.padEnd(34)} ${leg.seconds.toFixed(1).padStart(5)} s`).join('\n');
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
