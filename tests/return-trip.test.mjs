// The way home from the Guard Office, with and without the silent alarm.
// Proves every way home can still be done cleanly with the alarm on, and reports the times.
import test from 'node:test';
import assert from 'node:assert/strict';
import { returnTrip } from './bot/return-trips.mjs';

function check(wayHome, alarm) {
  const trip = returnTrip('front door', wayHome, alarm);
  assert.ok(trip.possible, `${wayHome}, alarm ${alarm}: blocked in the ${trip.blockedIn}`);
  const { world } = trip;
  assert.equal(world.over, 'win');
  assert.equal(world.silentAlarm, alarm);
  assert.equal(world.stats.timesSpotted, 0);
  assert.ok(world.allGuards.every((guard) => guard.state === 'calm' || guard.state === 'asleep'));
  const legs = trip.log.map((leg) => `${leg.room} ${leg.seconds.toFixed(1)} s`).join(', ');
  const title = `Way home by the ${wayHome}, silent alarm ${alarm ? 'ON' : 'off'}`;
  console.log(`\n  ${title}: ${trip.seconds.toFixed(1)} s (${legs})`);
  return trip;
}

test('home by the front door: possible without the silent alarm and with it', () => {
  const calm = check('front door', false);
  const alarmed = check('front door', true);
  assert.deepEqual(alarmed.world.silentAlarmReasons, ['camera']);
  assert.ok(alarmed.seconds > calm.seconds, 'the alarm makes the walk home slower, not impossible');
});

test('home by the one-way drop: possible without the silent alarm and with it', () => {
  check('one-way drop', false);
  const alarmed = check('one-way drop', true);
  assert.ok(alarmed.world.allGuards.filter((guard) => !guard.sleeper).every((guard) => guard.wary));
});

test('the duct is not a way home: the Guard Office ceiling vent only lets you out of the duct', () => {
  const trip = returnTrip('vents', 'one-way drop', true);
  assert.ok(trip.possible, 'players who came in by the vents go home by the drop');
  const office = trip.world.layout.rooms['guard-office'];
  assert.equal(office.portals.find((portal) => portal.id === 'go-ceiling').exitOnly, true);
});
