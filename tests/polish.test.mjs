// Tutorial hints, the timer warning, and the playtest text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import { playtestText, QUESTIONS } from '../site/js/game/playtest.js';
import { nextTutorial, TUTORIAL } from '../site/js/game/tutorial.js';
import { createWorld } from '../site/js/game/world.js';
import { eventTypes, guardById, prisonWorld, run } from './helpers.mjs';

const none = new Set();
const allBut = (id) => new Set(TUTORIAL.map((hint) => hint.id).filter((other) => other !== id));

test('there are hints for hide, crouch, knockout, and vent', () => {
  const ids = TUTORIAL.map((hint) => hint.id);
  for (const id of ['hide', 'crouch', 'knockout', 'vent']) assert.ok(ids.includes(id), id);
});

test('the first hint, in bed at the start, tells you the goal', () => {
  const hint = nextTutorial(createWorld(), none);
  assert.equal(hint.id, 'start');
  assert.match(hint.text, /keycard/);
});

test('each hint appears the first time you can do the thing', () => {
  const hide = prisonWorld('cell-block', 11.5);
  guardById(hide, 'cb-guard').x = 26;
  assert.equal(nextTutorial(hide, allBut('hide')).id, 'hide');

  const crouch = prisonWorld('cell-block', 12);
  assert.equal(nextTutorial(crouch, allBut('crouch')).id, 'crouch');

  const knockout = prisonWorld('cell-block', 15.2);
  assert.equal(nextTutorial(knockout, allBut('knockout')).id, 'knockout');

  const vent = prisonWorld('maintenance', 23);
  assert.equal(nextTutorial(vent, allBut('vent')).id, 'vent');

  const dark = prisonWorld('mess-hall', 1);
  assert.equal(nextTutorial(dark, allBut('dark')).id, 'dark');

  const door = prisonWorld('stairwell', 24);
  assert.equal(nextTutorial(door, allBut('door')).id, 'door');
});

test('a hint is never shown twice, and none show when there is nothing new to do', () => {
  const world = prisonWorld('cell-block', 11.5);
  assert.equal(nextTutorial(world, new Set(TUTORIAL.map((hint) => hint.id))), null);
  const empty = prisonWorld('maintenance', 4);
  assert.equal(nextTutorial(empty, new Set(['start', 'crouch'])), null);
});

test('the timer warns at 1:00 and ticks for the last ten seconds', () => {
  const world = createWorld();
  world.timeLeft = CONFIG.timerWarningSeconds + 0.5;
  run(world, {}, 1);
  assert.equal(eventTypes(world).filter((type) => type === 'timerWarning').length, 1);
  world.timeLeft = 10.5;
  world.events.length = 0;
  run(world, {}, 5);
  assert.equal(eventTypes(world).filter((type) => type === 'timerTick').length, 5);
  assert.equal(eventTypes(world).filter((type) => type === 'timerWarning').length, 0);
});

test('the playtest form asks the four questions from the spec', () => {
  assert.deepEqual([...QUESTIONS], [
    'Did hiding while a guard walked by feel tense?',
    'Did the timer feel exciting, or just stressful?',
    'Did the vent shortcut feel like a reward?',
    'Did you want to play again to do it faster or cleaner?',
  ]);
});

test('the playtest text includes the run, every question, and the answers', () => {
  const result = { won: true, rank: 'shadow', timeLeft: 185, timesSpotted: 0, knockouts: 2, bodiesFound: 0 };
  const text = playtestText(result, ['Yes, very', '', 'Did not find it'], 'Loved the snitches');
  assert.match(text, /rank Shadow, 3:05 left, spotted 0, knockouts 2/);
  for (const question of QUESTIONS) assert.ok(text.includes(question));
  assert.match(text, /Yes, very/);
  assert.match(text, /\(no answer\)/);
  assert.match(text, /Loved the snitches/);
  assert.match(playtestText(null, []), /not finished/);
});
