// Focused measurements. Fixture placement is explicit; these are not full-route win-rate runs.
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { keycardInReach } from '../../site/js/game/keycard.js';
import { panelInReach } from '../../site/js/game/interact.js';
import { CONFIG } from '../../site/js/game/config.js';
import { raiseAlarm } from '../../site/js/game/alert.js';
import { cameraLit, cameraSeesPlayer, createCamera } from '../../site/js/game/camera.js';
import { bodyPoints, coneLit, coneShape, guardSeesPlayer } from '../../site/js/game/vision.js';
import { inFan } from '../../site/js/game/sight.js';
import { emptyIntent } from '../../site/js/game/intent.js';
import { stepWorld } from '../../site/js/game/world.js';
import { pullInTarget } from '../../site/js/game/takedown.js';
import { prisonWorld, testWorld } from '../../tests/helpers.mjs';
const DT = 1 / 120;
const step = (w, keys = {}) => stepWorld(w, { ...emptyIntent(), ...keys }, DT);
const results = { timing: [], mismatch: {}, exploits: {}, performance: [] };
for (const distance of [1, 3, 6.5]) {
  for (const stance of ['still', 'crouched still', 'wary still', 'searching still']) {
    const w = testWorld({ playerX: 10 + distance,
      guards: [{ id: 'g', patrol: [10, 10], facing: 1, turnEvery: 100 }] });
    const g = w.guards[0];
    if (stance === 'wary still') g.wary = true;
    if (stance === 'searching still') {
      g.state = 'searching'; g.searchTimer = 20; g.lastKnownX = w.player.x; g.searchOrigin = w.player.x;
    }
    const row = { distance, stance, question: null, alert: null, lunge: null, grab: null };
    for (let i = 0; i < 15 / DT && !w.grab && !w.over; i += 1) {
      step(w, { crouch: stance === 'crouched still' });
      if (row.question === null && g.state === 'suspicious') row.question = w.time;
      if (row.alert === null && g.state === 'alert') row.alert = w.time;
      if (row.lunge === null && g.lunge > 0) row.lunge = w.time;
      if (w.grab) row.grab = w.time;
    }
    results.timing.push(row);
  }
}
// Compare body samples against the actual renderer polygon, rather than comparing logic to itself.
const guard = { x: 10, y: 0, facing: 1 };
const duck = { x: 10.1, y: 0, crouching: true };
results.mismatch.closeGuard = {
  player: duck, logic: guardSeesPlayer(guard, duck),
  drawn: bodyPoints(duck.x, 0.9).some((p) => inFan(coneLit(coneShape(guard)), p)),
};
const camera = createCamera({ id: 'c', min: 16.5, max: 21, halfWidth: 1.2, speed: 1.2 }, 'stairwell');
const examples = [];
let disagree = 0;
for (let x = 15; x < 20; x += 0.05) {
  const p = { x, y: 0, crouching: false };
  const logic = cameraSeesPlayer(camera, p);
  const drawn = bodyPoints(x, 1.7).some((point) => inFan(cameraLit(camera), point));
  if (logic !== drawn) {
    disagree += 1;
    if (examples.length < 3) examples.push({ x, logic, drawn });
  }
}
results.mismatch.camera = { camera, samples: 100, disagree, examples };
// The new pipes as chase refuges; placed on the pipe to isolate AI reachability.
for (const room of ['cell-block', 'laundry', 'mess-hall']) {
  const w = prisonWorld(room, room === 'cell-block' ? 11.5 : room === 'laundry' ? 18.3 : 14.2);
  w.player.y = 2.8;
  raiseAlarm(w, w.player.x, 'sight');
  let seen = 0;
  let grabs = 0;
  for (let i = 0; i < 90 / DT; i += 1) {
    step(w);
    if (w.guards.some((g) => g.seesPlayer)) seen += 1;
    if (w.grab || w.over) grabs += 1;
    w.events.length = 0;
  }
  results.exploits[room + ' pipe'] = { seconds: 90, seenTicks: seen, grabTicks: grabs, ended: w.over };
}
// Pull-ins: verify the wake-up and radio consequences instead of assuming permanent safety.
{
  const w = prisonWorld('cell-block', 11.5);
  w.player.hiddenIn = 'cb-locker-1';
  let pulledAt = null;
  let wakeAt = null;
  const calls = [];
  for (let i = 0; i < 110 / DT && !w.over; i += 1) {
    const leaving = pulledAt !== null && w.player.x > 4.5;
    step(w, { action: pulledAt === null && Boolean(pullInTarget(w)),
      moveX: leaving ? -1 : 0, crouch: true,
      up: pulledAt !== null && !leaving && !w.player.hiddenIn && !w.upWasHeld });
    if (pulledAt === null && w.stats.takedowns.pullIn > 0) pulledAt = w.time;
    for (const e of w.events) {
      if (e.type === 'wake') wakeAt = w.time;
      if (/checkIn|guardMoved|bodyFound|bang/i.test(e.type)) calls.push({ at: w.time, ...e });
    }
    w.events.length = 0;
  }
  results.exploits.pullIn = { pulledAt, wakeAt, calls, stats: w.stats };
}
// Repeated slides on an empty flat lane: measured displacement includes the re-entry frame.
{
  const w = testWorld({ width: 200, playerX: 10 });
  for (let i = 0; i < 10 / DT; i += 1) {
    step(w, { moveX: 1, crouch: true, jump: !w.player.sliding && !w.jumpWasHeld });
  }
  results.exploits.slideChain = { seconds: 10, distance: w.player.x - 10, speed: (w.player.x - 10) / 10,
    noise: w.noiseRadius, detectionFactor: CONFIG.awareness.crouchFactor };
}
// Thin barriers: can an alerted guard grab a player from the opposite side?
{
  const w = testWorld({ playerX: 10.43,
    guards: [{ id: 'g', patrol: [9.5, 9.5], facing: 1 }],
    solids: [{ id: 'wall', x: 10, halfWidth: 0.12, bottom: 0, top: 3 }] });
  raiseAlarm(w, w.player.x, 'sight');
  for (let i = 0; i < 4 / DT && !w.grab; i += 1) step(w);
  results.exploits.barrierGrab = { grabbed: Boolean(w.grab), at: w.time, playerX: w.player.x, guardX: w.guards[0].x };
}
// Entering cover after the first "?" bypasses the remaining sight meter.
{
  const w = testWorld({ playerX: 11, guards: [{ id: 'g', patrol: [10, 10], facing: 1 }],
    hideSpots: [{ id: 'locker', type: 'locker', x: 11 }] });
  while (w.guards[0].detection < CONFIG.guard.glimpseThreshold) step(w);
  const before = { time: w.time, detection: w.guards[0].detection };
  step(w, { up: true });
  const after = { time: w.time, detection: w.guards[0].detection, state: w.guards[0].state };
  while (!w.grab && w.time < 5) step(w);
  results.exploits.watchedHide = { before, after, grabbedAt: w.grab ? w.time : null };
}
// Height audit: these interact targets ignore vertical separation, unlike ordinary pickups.
{
  const w = prisonWorld('guard-office', 10.5);
  w.player.y = 5;
  const card = Boolean(keycardInReach(w));
  const panelWorld = prisonWorld('maintenance', 21.1);
  panelWorld.player.y = 5;
  results.exploits.interactHeight = { feetY: 5, keycardInReach: card,
    panelInReach: Boolean(panelInReach(panelWorld)) };
}
// Cost of full logic ticks in the busiest outdoor room, on this host (not a MacBook Air GPU claim).
for (const room of ['cell-block', 'mess-hall', 'yard']) {
  const w = prisonWorld(room, 1);
  w.player.hiddenIn = 'benchmark';
  const start = performance.now();
  for (let i = 0; i < 12000; i += 1) { step(w); w.events.length = 0; }
  results.performance.push({ room, steps: 12000, ms: performance.now() - start });
}
// Count the duplicated geometry work done by one visible searchlight query and its look/render paths.
results.performance.push({ note: 'searchlightShape called by camera detection, player look, drawing, debug drawing' });
writeFileSync(new URL('probes.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
