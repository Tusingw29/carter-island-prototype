// Review-only shove fixtures. Run: node tools/review/shove-playtest.mjs
import { writeFileSync } from 'node:fs';
import { CONFIG } from '../../site/js/game/config.js';
import { emptyIntent } from '../../site/js/game/intent.js';
import { stepWorld } from '../../site/js/game/world.js';
import { shove } from '../../site/js/game/shove.js';
import { currentPrompt } from '../../site/js/game/prompts.js';
import { prisonWorld, testWorld } from '../../tests/helpers.mjs';
const DT = 1 / 120;
const step = (w, keys = {}) => stepWorld(w, { ...emptyIntent(), ...keys }, DT);
const rows = [];
function fixture(room, x, y) {
  const w = room === 'flat' ? testWorld({ playerX: x,
    guards: [{ id: 'g', patrol: [34.6, 34.6], facing: -1, turnEvery: 100 }] }) : prisonWorld('yard', x);
  // Let the ground patrol leave the tower's drop-attack radius using normal simulation.
  // Hidden fixture setup prevents detection during this two-second phase alignment.
  w.player.hiddenIn = 'review-setup';
  w.player.y = y;
  for (let i = 0; i < 2 / DT; i += 1) step(w);
  w.player.hiddenIn = null;
  w.player.y = y;
  w.events.length = 0;
  return w;
}
for (const variant of ['current', 'stun 2.5', 'push 2']) {
  for (const room of ['flat', 'tower']) {
    for (const position of [33.9, 35.4, 35.8, 36]) {
      for (const response of ['stay', 'run left', 'run right', 'jump left', 'retry Space', 'Space while stunned']) {
        const w = fixture(room, position, room === 'tower' ? 5.8 : 0);
        const g = w.guards.find((v) => v.id === (room === 'tower' ? 'yd-tower-1' : 'g'));
        const before = { x: g.x, y: g.y, state: g.state, prompt: currentPrompt(w)?.text };
        if (variant === 'current') step(w, { action: true });
        else {
          const cfg = { ...CONFIG, shove: { ...CONFIG.shove,
            stunSeconds: variant === 'stun 2.5' ? 2.5 : 1.5,
            pushMetres: variant === 'push 2' ? 2 : 1 } };
          // Hypothetical balance trial: invoke shove explicitly, without changing config or game code.
          shove(w, g, cfg);
        }
        const after = { x: g.x, y: g.y, state: g.state, hold: Boolean(w.hold),
          displacement: Math.abs(g.x - before.x), prompt: currentPrompt(w)?.text };
        const events = [];
        let grabbedAt = null;
        let lungeAt = null;
        let recoveredAt = null;
        let retryPrompt = null;
        let reachedRoof = false;
        const shoveAt = w.time;
        for (let i = 0; i < 6 / DT && !w.over; i += 1) {
          const elapsed = w.time - shoveAt;
          const keys = {};
          if (response === 'run left') Object.assign(keys, { moveX: -1, run: true });
          if (response === 'run right') Object.assign(keys, { moveX: 1, run: true });
          if (response === 'jump left') Object.assign(keys, { moveX: -1, jump: true, run: true });
          if (response === 'retry Space' && elapsed >= 1.65 && elapsed < 1.68) keys.action = true;
          if (response === 'Space while stunned' && elapsed >= 0.15 && elapsed < 0.18) keys.action = true;
          if (elapsed >= 1.65 && retryPrompt === null) retryPrompt = currentPrompt(w)?.text ?? '(none)';
          step(w, keys);
          if (room === 'tower' && w.player.onGround && Math.abs(w.player.y - 5.4) < 0.01
            && w.player.x >= 11 && w.player.x <= 31.5) reachedRoof = true;
          if (recoveredAt === null && g.stun <= 0 && g.state === 'alert') recoveredAt = w.time - shoveAt;
          for (const e of w.events) {
            if (e.type === 'lunge' && e.guardId === g.id && lungeAt === null) lungeAt = w.time - shoveAt;
            if (['shove', 'grabGuard', 'knockout', 'tooRisky', 'lunge', 'grab', 'solitary'].includes(e.type)) {
              events.push({ at: w.time - shoveAt, type: e.type, guardId: e.guardId });
            }
          }
          w.events.length = 0;
          if (w.grab) { grabbedAt = w.time - shoveAt; break; }
        }
        rows.push({ variant, room, position, response, before, after, recoveredAt, lungeAt, grabbedAt,
          retryPrompt, reachedRoof, events, spottedBy: w.stats.spottedBy, holdAtEnd: Boolean(w.hold),
          playerEnd: { x: w.player.x, y: w.player.y }, guardEnd: { x: g.x, y: g.y } });
      }
    }
  }
}
// Edge clamp probe: shoves cannot move a tower guard beyond his bounds or make him fall.
const edges = [];
for (const x of [33.8, 34.6, 36.4, 37.2]) {
  const w = fixture('tower', x - 0.7, 5.8);
  const g = w.guards.find((v) => v.id === 'yd-tower-1');
  g.x = x;
  shove(w, g);
  edges.push({ startX: x, endX: g.x, y: g.y, pushed: g.x - x });
}
// How far does the rear action change when one tap becomes a two-tap intended knockout?
const rear = [];
for (const x of [35.4, 35.8, 36]) {
  const w = fixture('tower', x, 5.8);
  const before = currentPrompt(w)?.text;
  step(w, { action: true }); step(w); step(w, { action: true });
  const g = w.guards.find((v) => v.id === 'yd-tower-1');
  rear.push({ x, prompt: before, state: g.state, takedowns: w.stats.takedowns, spottedBy: w.stats.spottedBy,
    searchlightOff: w.cameras.find((c) => c.id === 'yd-light-1').off });
}
const followUp = fixture('tower', 33.9, 5.8);
const victim = followUp.guards.find((g) => g.id === 'yd-tower-1');
step(followUp, { action: true }); step(followUp);
// Explicit placement isolates the action rule during stun, not the movement needed to get there.
followUp.player.x = victim.x + 0.8;
const stunPrompt = currentPrompt(followUp)?.text;
step(followUp, { action: true });
const stunFollowUp = { prompt: stunPrompt, held: Boolean(followUp.hold), guardState: victim.state,
  stunRemaining: victim.stun, events: followUp.events.map((e) => e.type) };
writeFileSync(new URL('shove-results.json', import.meta.url),
  JSON.stringify({ rows, edges, rear, stunFollowUp }, null, 2) + '\n');
for (const r of rows.filter((r) => r.variant === 'current' && r.position === 33.9)) {
  console.log(r.room, r.response, 'push', r.after.displacement.toFixed(2), 'grab', r.grabbedAt,
    'end', r.playerEnd, 'retry prompt', r.retryPrompt);
}
console.log('edges', edges);
console.log('rear', rear);
