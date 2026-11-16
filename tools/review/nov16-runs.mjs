// Current-build cohorts. Every run starts in the original bed with no granted inventory.
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { reviewJSON } from './nov16-json.mjs';
import { createWorld, stepWorld, observed } from './nov16-bridge.mjs';
import { emptyIntent } from '../../site/js/game/intent.js';
import { scoreRun, canSleep } from '../../site/js/game/run.js';
import { portalX } from '../../site/js/game/portals.js';
import { grabTarget, pullInTarget } from '../../site/js/game/takedown.js';
import { isStaggering, shoveTarget, shoveReady } from '../../site/js/game/shove.js';
const DT = 1 / 120;
const bridge = new URL('nov16-bridge.mjs', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes('/tests/bot/') && specifier.endsWith('/game/world.js')) {
    return { url: bridge, shortCircuit: true };
  }
  return next(specifier, context);
} });
const routes = await import('../../tests/bot/routes.mjs');
const yard = await import('../../tests/bot/yard-routes.mjs');
const { plan, follow } = await import('../../tests/bot/planner.mjs');
const { rusherRun } = await import('../../tests/bot/rusher.mjs');
const rows = [];
const step = (w, keys = {}) => stepWorld(w, { ...emptyIntent(), ...keys }, DT);
const output = new URL(`nov16-${process.argv[2] ?? 'reactive'}-working.json`, import.meta.url);
function save(type, delay, w, error = null) {
  rows.push({ type, delay, error, seconds: w.time, ...scoreRun(w), heat: w.heat,
    inventory: { boots: w.player.hasBoots, screwdriver: w.player.hasScrewdriver },
    visited: [...w.visited], observation: observed.get(w) });
  writeFileSync(output, reviewJSON(rows));
  console.log(type, delay, w.over, w.timeLeft.toFixed(2), error ?? '');
}
function go(w, goal) {
  const moves = plan(w, goal);
  if (!moves) throw new Error('planner blocked: ' + JSON.stringify(goal));
  follow(w, moves);
}
function pull(w, spot, x, interrogate = false) {
  go(w, { x, tolerance: 0.35, hidden: spot });
  for (let i = 0; i < 75 / DT; i += 1) {
    const target = pullInTarget(w);
    if (target && !interrogate) { step(w, { action: true }); step(w); return; }
    if (target && (w.player.x - target.x) * target.facing < -0.15
      && Math.abs(w.player.x - target.x) <= 1.02) {
      step(w, { up: true }); step(w); step(w, { action: true }); step(w);
      if (!w.hold) throw new Error('rear grab missed');
      step(w, { ask: true }); step(w);
      for (let j = 0; j < 2.1 / DT && w.hold && !w.hold.talked; j += 1) step(w);
      if (!w.hold?.talked) throw new Error('interrogation interrupted');
      step(w, { action: true }); step(w);
      return;
    }
    step(w);
    if (w.over || w.solitary.used) throw new Error('capture while waiting');
  }
  throw new Error('no opportunity in 75 seconds');
}
function pullRoute(intel = false) {
  const w = createWorld();
  const log = [];
  try {
    pull(w, 'cb-locker-1', 11.5, intel);
    routes.leaveByHall(w, 'cb-east', log);
    pull(w, 'mh-table-1', 8);
    pull(w, 'mh-table-3', 30);
    routes.leaveByHall(w, 'mh-east', log);
    pull(w, 'sw-counter', 9);
    routes.leaveByDoor(w, 'sw-door', log);
    go(w, { x: 12.7, tolerance: 0.3 });
    step(w, { action: true }); step(w); step(w, { action: true }); step(w);
    routes.liftKeycard(w, log);
    routes.leaveByDoor(w, 'go-drop', log);
    routes.goToBedAndSleep(w, log);
    return { world: w };
  } catch (e) { return { world: w, error: e.message }; }
}
function targetFor(w) {
  const p = w.player;
  const room = w.room;
  if (p.hasKeycard) {
    if (room.id === 'cell-block') return { kind: 'bed', x: 4.5 };
    const drop = room.portals.find((q) => q.id === 'go-drop');
    if (drop) return { ...drop, kind: 'portal' };
  }
  if (room.id === 'guard-office') return { kind: 'card', x: 10.5 };
  const id = { 'cell-block': 'cb-east', 'mess-hall': 'mh-east', stairwell: 'sw-door' }[room.id];
  const q = room.portals.find((v) => v.id === id);
  return q ? { ...q, kind: 'portal', x: portalX(room, q) } : null;
}
function reactive(type) {
  const w = createWorld();
  let grabbedAt = null;
  let pending = null;
  let heldAt = null;
  const latency = type.endsWith('250ms') ? 0.25 : type.endsWith('500ms') ? 0.5 : 0;
  while (!w.over) {
    const p = w.player;
    let keys = {};
    if (w.solitary.phase) keys.interact = !w.interactWasHeld;
    else if (w.grab) {
      grabbedAt ??= w.time;
      const since = w.time - grabbedAt - 0.25;
      const hz = type === 'Rush 3Hz' ? 3 : 5;
      keys.action = since >= 0 && (since % (1 / hz)) < 0.06;
    } else if (w.hold) {
      heldAt ??= w.time;
      keys.action = w.time - heldAt >= latency && !w.actionWasHeld;
    }
    else {
      grabbedAt = null;
      heldAt = null;
      const target = targetFor(w);
      if (!target) throw new Error('unexpected room: ' + w.room.id);
      const d = target.x - p.x;
      if (p.hiddenIn) keys = target.kind === 'bed' && p.hiddenIn === 'bed'
        ? { interact: !w.interactWasHeld } : { up: !w.upWasHeld };
      else if (Math.abs(d) > (target.type === 'hall' ? 0.005 : 0.35)) {
        keys = { moveX: Math.sign(d), run: type !== 'Careless' };
      } else if (target.kind === 'bed') keys = canSleep(w)
        ? { interact: !w.interactWasHeld } : { up: !w.upWasHeld };
      else if (target.kind === 'card') keys.interact = !w.interactWasHeld;
      else if (target.type === 'hall') keys.moveX = target.side === 'left' ? -1 : 1;
      else keys.up = !w.upWasHeld;
      if (type.startsWith('Shove-grab')) {
        if (grabTarget(w)) { keys = { action: !w.actionWasHeld }; }
        else {
          const stagger = w.guards.find((g) => isStaggering(g));
          if (stagger) keys = { moveX: Math.sign(stagger.x - p.x), run: true };
          else if (shoveReady(w) && shoveTarget(w)) keys.shove = !w.shoveWasHeld;
        }
      }
    }
    if (latency > 0 && !w.hold && (keys.action || keys.shove) && !w.grab) {
      const kind = keys.action ? 'action' : 'shove';
      if (pending?.kind !== kind) pending = { kind, at: w.time };
      if (w.time - pending.at < latency) keys = {};
      else pending = null;
    }
    step(w, keys);
    w.events.length = 0;
  }
  return w;
}
const mode = process.argv[2] ?? 'reactive';
if (mode === 'reactive' || mode === 'latency') {
  for (let i = 0; i < 30; i += 1) {
    const delay = i * 0.5;
    const types = mode === 'latency' ? ['Shove-grab 250ms', 'Shove-grab 500ms']
      : ['Rusher 60Hz', 'Rush 5Hz', 'Rush 3Hz', 'Careless', 'Shove-grab'];
    for (const type of types) {
      globalThis.nov16Delay = delay;
      if (type === 'Rusher 60Hz') {
        globalThis.nov16Delay = 0;
        save(type, delay, rusherRun(delay).world);
      } else save(type, delay, reactive(type));
    }
  }
} else {
  for (const delay of [0, 2, 6, 10, 14, 18]) {
    globalThis.nov16Delay = delay;
    for (const [type, play] of Object.entries({
      'Ghost drop': routes.frontDoorThenDropRun, 'Ghost return': routes.frontDoorRun,
      'Vent-first': routes.ventRun, 'Roof hoop': yard.bootsThenRoofByHoopRun,
      'Roof quiet tower': yard.bootsThenRoofByTowerRun,
      'Pull-heavy': () => pullRoute(false), 'Intel + pulls': () => pullRoute(true),
    })) {
      const { world, error } = play();
      save(type, delay, world, error);
    }
  }
}
