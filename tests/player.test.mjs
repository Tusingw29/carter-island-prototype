import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { emptyIntent } from '../site/js/game/intent.js';
import { createPlayer, playerHeight, playerMode, speedForMode, updatePlayer } from '../site/js/game/player.js';
import { noiseRadius } from '../site/js/game/noise.js';

const intent = (changes) => ({ ...emptyIntent(), ...changes });
const WIDTH = 26;

test('run is faster than walk, and walk is faster than crouch', () => {
  assert.ok(speedForMode('run') > speedForMode('walk'));
  assert.ok(speedForMode('walk') > speedForMode('crouch'));
  assert.ok(speedForMode('crouch') > 0);
  assert.equal(speedForMode('idle'), 0);
  assert.equal(speedForMode('hidden'), 0);
});

test('the player moves at exactly the configured speed for each mode', () => {
  const cases = [
    [{ moveX: 1 }, CONFIG.player.walkSpeed],
    [{ moveX: 1, run: true }, CONFIG.player.runSpeed],
    [{ moveX: 1, crouch: true }, CONFIG.player.crouchSpeed],
    [{ moveX: -1 }, -CONFIG.player.walkSpeed],
  ];
  for (const [changes, perSecond] of cases) {
    const player = createPlayer(10);
    updatePlayer(player, intent(changes), 0.5, WIDTH);
    assert.ok(Math.abs(player.x - (10 + perSecond * 0.5)) < 1e-9);
  }
});

test('movement is instant: full speed on the first step, dead stop on release', () => {
  const player = createPlayer(10);
  updatePlayer(player, intent({ moveX: 1, run: true }), 1 / 120, WIDTH);
  assert.ok(Math.abs(player.x - (10 + CONFIG.player.runSpeed / 120)) < 1e-9);
  const stoppedAt = player.x;
  updatePlayer(player, intent({}), 1 / 120, WIDTH);
  assert.equal(player.x, stoppedAt);
  assert.equal(player.mode, 'idle');
});

test('crouch beats run when both are held', () => {
  const player = createPlayer(10);
  assert.equal(playerMode(player, intent({ moveX: 1, run: true, crouch: true })), 'crouch');
});

test('crouching makes the player shorter, even when standing still', () => {
  const player = createPlayer(10);
  updatePlayer(player, intent({ crouch: true }), 0.1, WIDTH);
  assert.equal(player.mode, 'idle');
  assert.equal(playerHeight(player), CONFIG.player.crouchHeight);
  updatePlayer(player, intent({}), 0.1, WIDTH);
  assert.equal(playerHeight(player), CONFIG.player.standHeight);
});

test('the player faces the way they last moved', () => {
  const player = createPlayer(10);
  updatePlayer(player, intent({ moveX: -1 }), 0.1, WIDTH);
  assert.equal(player.facing, -1);
  updatePlayer(player, intent({}), 0.1, WIDTH);
  assert.equal(player.facing, -1);
});

test('the player cannot leave the room', () => {
  const player = createPlayer(1);
  updatePlayer(player, intent({ moveX: -1, run: true }), 5, WIDTH);
  assert.equal(player.x, CONFIG.player.wallMargin);
  updatePlayer(player, intent({ moveX: 1, run: true }), 50, WIDTH);
  assert.equal(player.x, WIDTH - CONFIG.player.wallMargin);
});

test('noise: running is loud, walking is quiet, crouching and standing are silent', () => {
  assert.ok(noiseRadius('run') > noiseRadius('walk'));
  assert.ok(noiseRadius('walk') > 0);
  assert.equal(noiseRadius('crouch'), 0);
  assert.equal(noiseRadius('idle'), 0);
  assert.equal(noiseRadius('hidden'), 0);
});
