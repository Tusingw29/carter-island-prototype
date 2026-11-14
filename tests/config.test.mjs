import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { formatClock } from '../site/js/game/clock.js';

test('headcount timer is 7:00, inside its tuning range', () => {
  assert.equal(CONFIG.headcountSeconds, 420);
  assert.ok(CONFIG.headcountSeconds >= CONFIG.headcountMinSeconds);
  assert.ok(CONFIG.headcountSeconds <= CONFIG.headcountMaxSeconds);
  assert.equal(CONFIG.headcountMinSeconds, 420);
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
