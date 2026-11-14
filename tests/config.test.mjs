import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { formatClock } from '../site/js/game/clock.js';

test('headcount timer stays inside the 8 to 10 minute tuning range', () => {
  assert.ok(CONFIG.headcountSeconds >= CONFIG.headcountMinSeconds);
  assert.ok(CONFIG.headcountSeconds <= CONFIG.headcountMaxSeconds);
  assert.equal(CONFIG.headcountMinSeconds, 480);
  assert.equal(CONFIG.headcountMaxSeconds, 600);
});

test('bed check happens during the run, not before or after it', () => {
  assert.ok(CONFIG.bedCheckAtSecondsRemaining > 0);
  assert.ok(CONFIG.bedCheckAtSecondsRemaining < CONFIG.headcountSeconds);
});

test('formatClock shows minutes and two-digit seconds', () => {
  assert.equal(formatClock(540), '9:00');
  assert.equal(formatClock(300), '5:00');
  assert.equal(formatClock(61), '1:01');
  assert.equal(formatClock(0.2), '0:01');
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(-5), '0:00');
});
