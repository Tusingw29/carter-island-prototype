// A deliberate pull-in-heavy route, in addition to the opportunistic running policy.
import { writeFileSync } from 'node:fs';
import { createWorld, stepWorld } from '../../site/js/game/world.js';
import { emptyIntent } from '../../site/js/game/intent.js';
import { pullInTarget } from '../../site/js/game/takedown.js';
import { scoreRun } from '../../site/js/game/run.js';
import { follow, plan } from '../../tests/bot/planner.mjs';
import { leaveByHall, leaveByDoor, liftKeycard, goToBedAndSleep } from '../../tests/bot/routes.mjs';
const DT = 1 / 120;
const step = (w, keys = {}) => stepWorld(w, { ...emptyIntent(), ...keys }, DT);
function go(w, goal) {
  const steps = plan(w, goal);
  if (!steps) throw new Error('planner cannot reach ' + JSON.stringify(goal));
  follow(w, steps);
}
function pull(w, spot, x) {
  go(w, { x, tolerance: 0.35, hidden: spot });
  for (let i = 0; i < 75 / DT; i += 1) {
    if (pullInTarget(w)) { step(w, { action: true }); step(w); return; }
    step(w);
    if (w.over || w.solitary.used) throw new Error('capture while waiting for pull-in');
  }
  throw new Error('no pull-in opportunity');
}
const runs = [];
for (let n = 0; n < 10; n += 1) {
  const w = createWorld();
  const log = [];
  let error = null;
  try {
    for (let i = 0; i < n * 2 / DT; i += 1) step(w);
    pull(w, 'cb-locker-1', 11.5);
    leaveByHall(w, 'cb-east', log);
    pull(w, 'mh-table-1', 8);
    pull(w, 'mh-table-3', 30);
    leaveByHall(w, 'mh-east', log);
    pull(w, 'sw-counter', 9);
    leaveByDoor(w, 'sw-door', log);
    go(w, { x: 12.7, tolerance: 0.3 });
    step(w, { action: true }); step(w); step(w, { action: true }); step(w);
    liftKeycard(w, log);
    leaveByDoor(w, 'go-drop', log);
    goToBedAndSleep(w, log);
  } catch (e) { error = e.message; }
  const row = { departure: n * 2, error, seconds: w.time, ...scoreRun(w), stats: w.stats };
  runs.push(row);
  console.log(n, w.over, w.time, error);
  writeFileSync(new URL('pull-results.json', import.meta.url), JSON.stringify(runs, null, 2) + '\n');
}
