// Explicit stationary fixtures, not route runs. Measure warning clocks and drawn/checked shapes.
import { writeFileSync } from 'node:fs';
import { testWorld, prisonWorld } from '../../tests/helpers.mjs';
import { stepWorld } from '../../site/js/game/world.js';
import { emptyIntent } from '../../site/js/game/intent.js';
import { CONFIG } from '../../site/js/game/config.js';
import { bodyPoints, coneShape, coneLit, closeZone, guardSeesPlayer } from '../../site/js/game/vision.js';
import { cameraShape, createCamera, cameraSeesPlayer } from '../../site/js/game/camera.js';
import { inFan } from '../../site/js/game/sight.js';
import { raiseAlarm } from '../../site/js/game/alert.js';
const out = { timing: [], geometry: [], refuges: [] };
const dt = 1 / 120;
const step = (w, intent = {}) => stepWorld(w, { ...emptyIntent(), ...intent }, dt);
for (const distance of [1, 3, 6.5]) {
  for (const stance of ['still', 'crouched still', 'wary still', 'searching still']) {
    const w = testWorld({ playerX: 10 + distance,
      guards: [{ id: 'g', patrol: [10, 10], facing: 1, turnEvery: 100 }] });
    const g = w.guards[0];
    if (stance === 'wary still') g.wary = true;
    if (stance === 'searching still') Object.assign(g, {
      state: 'searching', searchTimer: 20, lastKnownX: w.player.x, searchOrigin: w.player.x,
    });
    const row = { distance, stance, question: null, alert: null, lunge: null, grab: null };
    for (let i = 0; i < 15 / dt && !w.grab && !w.over; i += 1) {
      step(w, { crouch: stance === 'crouched still' });
      if (row.question === null && g.state === 'suspicious') row.question = w.time;
      if (row.alert === null && g.state === 'alert') row.alert = w.time;
      if (row.lunge === null && g.lunge > 0) row.lunge = w.time;
      if (w.grab) row.grab = w.time;
    }
    out.timing.push(row);
  }
}
const guard = { x: 10, y: 0, facing: 1 };
const camera = createCamera({ id: 'c', min: 16.5, max: 21, halfWidth: 1.2, speed: 1.2 }, 'fixture');
for (const source of ['guard', 'camera']) {
  let mismatches = 0;
  let samples = 0;
  for (let n = 0; n < 200; n += 1) {
    for (const crouching of [true, false]) {
      const p = { x: 9 + n * 0.06, y: 0, crouching };
      const points = bodyPoints(p.x, crouching ? 0.9 : 1.7);
      let drawn;
      let checked;
      if (source === 'guard') {
        const zone = closeZone(guard);
        drawn = points.some((q) => inFan(coneLit(coneShape(guard)), q)
          || (q.x >= zone.x0 && q.x <= zone.x1 && q.y >= zone.y0 && q.y <= zone.y1));
        checked = guardSeesPlayer(guard, p);
      } else {
        drawn = points.some((q) => inFan(cameraShape(camera).fan, q));
        checked = cameraSeesPlayer(camera, p);
      }
      samples += 1;
      if (drawn !== checked) mismatches += 1;
    }
  }
  out.geometry.push({ source, samples, mismatches });
}
for (const [room, x] of [['cell-block', 11.5], ['laundry', 18.3], ['mess-hall', 14.2]]) {
  const w = prisonWorld(room, x);
  w.player.y = 2.8;
  raiseAlarm(w, x, 'sight');
  let grabbed = false;
  for (let i = 0; i < 90 / dt && !w.over; i += 1) {
    step(w);
    grabbed ||= Boolean(w.grab);
    w.events.length = 0;
  }
  out.refuges.push({ room, seconds: w.time, grabbed, outcome: w.over });
}
out.config = { reaction: CONFIG.guard.reactSeconds, windup: CONFIG.guard.lungeWindupSeconds };
writeFileSync(new URL('nov16-audit.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
