// Current-build focused checks. Fixture placement is explicit; no production file is changed.
import { writeFileSync } from 'node:fs';
import { testWorld, prisonWorld } from '../../tests/helpers.mjs';
import { stepWorld } from '../../site/js/game/world.js';
import { emptyIntent } from '../../site/js/game/intent.js';
import { currentPrompt } from '../../site/js/game/prompts.js';
import { isStaggering } from '../../site/js/game/shove.js';
import { finishLunge } from '../../site/js/game/grab.js';
import { keycardInReach, takeKeycard } from '../../site/js/game/keycard.js';
const DT = 1 / 120;
const tick = (w, keys = {}) => stepWorld(w, { ...emptyIntent(), ...keys }, DT);
const run = (w, seconds, keys = {}) => {
  for (let i = 0; i < Math.round(seconds / DT); i += 1) tick(w, keys);
};
const tap = (w, key) => { tick(w, { [key]: true }); tick(w); };
const fresh = () => testWorld({ width: 100, playerX: 10.7,
  guards: [{ id: 'g', patrol: [10, 10], facing: 1, turnEvery: 100 }] });
const results = { rear: [], followUp: [], ledge: [], lifecycle: [], office: [] };
for (const x of [35.4, 35.8, 36]) {
  const w = prisonWorld('yard', x);
  w.player.hiddenIn = 'setup'; run(w, 2); w.player.hiddenIn = null; w.player.y = 5.8;
  const before = currentPrompt(w)?.text;
  tap(w, 'action'); tap(w, 'action');
  results.rear.push({ x, before, shoves: w.stats.shoves, knockouts: w.stats.knockouts,
    spots: w.stats.timesSpotted, tower: w.guards.find((g) => g.id === 'yd-tower-1').state });
}
for (const response of ['wait', 'obey grab cue', 'close then grab']) {
  const w = fresh();
  tap(w, 'shove');
  const g = w.guards[0];
  const opening = { gap: Math.abs(g.x - w.player.x), prompt: currentPrompt(w)?.text, stun: g.stun };
  let grabbedAt = null;
  for (let i = 0; i < 4 / DT && !w.over && !w.hold; i += 1) {
    let keys = {};
    if (response === 'obey grab cue') keys.action = !w.actionWasHeld;
    if (response === 'close then grab') {
      if (Math.abs(g.x - w.player.x) > 1.05) keys = { moveX: Math.sign(g.x - w.player.x), run: true };
      else keys.action = !w.actionWasHeld;
    }
    tick(w, keys);
    if (w.grab) { grabbedAt = w.time; break; }
  }
  results.followUp.push({ response, opening, grabbedAt, held: Boolean(w.hold), state: g.state });
}
for (const room of ['yard']) {
  const w = prisonWorld(room, 36.4);
  w.player.hiddenIn = 'setup'; run(w, 2); w.player.hiddenIn = null; w.player.y = 5.8;
  const g = w.guards.find((v) => v.id === 'yd-tower-1');
  // Edge fixture: the guard is at his legal east limit, facing the nearby player.
  Object.assign(g, { x: 37.2, facing: -1 });
  const before = currentPrompt(w)?.text;
  tap(w, 'shove');
  let landing = null;
  for (let i = 0; i < 3 / DT; i += 1) {
    tick(w);
    if (!g.falling && g.state === 'out') { landing = w.time - 2; break; }
  }
  results.ledge.push({ before, landing, x: g.x, y: g.y, state: g.state, shoves: w.stats.shoves,
    shovedOff: w.stats.shovedOff, takedowns: w.stats.takedowns,
    lightOff: w.cameras.find((c) => c.id === 'yd-light-1').off });
}
// Lifecycle check: does an expired shove let a later, different stun qualify for a shove grab?
for (const priorShove of [false, true]) {
  const w = fresh();
  const g = w.guards[0];
  if (priorShove) tap(w, 'shove');
  run(w, 2, { moveX: 1, run: true });
  // Explicit lunge-result fixture using the real miss function, not a fabricated stun number.
  g.state = 'alert'; g.facing = 1; w.player.x = g.x - 0.5;
  finishLunge(g, w);
  w.player.x = g.x - 0.8;
  const before = { stun: g.stun, staggerFull: g.staggerFull, qualifies: isStaggering(g) };
  tap(w, 'action');
  results.lifecycle.push({ priorShove, before, held: Boolean(w.hold) });
}
for (const order of ['KO then card', 'card then KO']) {
  const w = prisonWorld('guard-office', 13);
  if (order === 'card then KO') takeKeycard(w, 'fast'); // Explicit order fixture; cohort uses real E input.
  tap(w, 'action'); tap(w, 'action');
  if (order === 'KO then card') takeKeycard(w, 'fast');
  results.office.push({ order, guard: w.guards[0].state, alarm: w.silentAlarm });
}
const high = prisonWorld('guard-office', 10.5);
high.player.y = 5;
results.vertical = { feetY: high.player.y, cardInReach: Boolean(keycardInReach(high)) };
writeFileSync(new URL('nov16-mechanics.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
