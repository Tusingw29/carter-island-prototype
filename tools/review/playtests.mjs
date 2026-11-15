// Run: node tools/review/playtests.mjs. Records the existing planning bots once, then tests
// fixed input replays and reactive policies against 30 deterministic departure delays.
import { registerHooks } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createWorld, stepWorld } from '../../site/js/game/world.js';
import { emptyIntent } from '../../site/js/game/intent.js';
import { portalX } from '../../site/js/game/portals.js';
import { grabTarget, pullInTarget, dropTarget } from '../../site/js/game/takedown.js';
import { scoreRun, canSleep } from '../../site/js/game/run.js';
const DT = 1 / 120;
const dir = new URL('./', import.meta.url);
const tapePath = new URL('tapes.json', dir);
const outputPath = new URL('results.json', dir);
const emit = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
let tapes;
if (existsSync(tapePath)) tapes = JSON.parse(readFileSync(tapePath, 'utf8'));
else {
  const bridge = new URL('record-bridge.mjs', dir).href;
  const hook = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL?.includes('/tests/bot/') && specifier.endsWith('/game/world.js')) {
        return { url: bridge, shortCircuit: true };
      }
      return next(specifier, context);
    },
  });
  const routes = await import('../../tests/bot/routes.mjs');
  const yard = await import('../../tests/bot/yard-routes.mjs');
  tapes = {};
  for (const [name, play] of Object.entries({
    Ghost: routes.frontDoorThenDropRun,
    'Vent-first': routes.ventRun,
    'Yard roof route': yard.bootsThenRoofByHoopRun,
  })) {
    const tape = [];
    globalThis.reviewRecord = (world, input) => {
      const last = tape.at(-1);
      const keys = JSON.stringify(Object.fromEntries(Object.entries(input).filter(([, value]) => value)));
      if (last && last.keys === keys) last.ticks += 1;
      else tape.push({ keys, ticks: 1 });
    };
    const { world } = play();
    tapes[name] = { seconds: world.time, result: scoreRun(world), tape };
    console.log('recorded', name, world.time, world.over);
  }
  delete globalThis.reviewRecord;
  hook.deregister();
  emit(tapePath, tapes);
}
function tick(world, keys = {}, captures = []) {
  const room = world.room.id;
  const used = world.solitary.used;
  stepWorld(world, { ...emptyIntent(), ...keys }, DT);
  if (!used && world.solitary.used) captures.push({ room, kind: 'solitary', at: world.time });
  if (world.over === 'caught') captures.push({ room, kind: 'final', at: world.time });
  world.events.length = 0;
}
function wait(world, seconds, captures) {
  for (let i = 0; i < Math.round(seconds / DT) && !world.over; i += 1) tick(world, {}, captures);
}
function replay(name, delay) {
  const world = createWorld();
  const captures = [];
  wait(world, delay, captures);
  for (const entry of tapes[name].tape) {
    const keys = JSON.parse(entry.keys);
    for (let i = 0; i < entry.ticks && !world.over; i += 1) tick(world, keys, captures);
    if (world.over) break;
  }
  // Fixed replays cannot repair a missed interaction. Finish the timer honestly; no teleport/reset.
  while (!world.over) tick(world, { interact: canSleep(world) }, captures);
  return { type: name, delay, ...scoreRun(world), captures,
    routeUsed: [...world.visited], tools: { screwdriver: world.player.hasScrewdriver, boots: world.player.hasBoots } };
}
// Every reactive policy knows the objective graph, but does not forecast patrols or wait for them.
function reactive(type, delay) {
  const world = createWorld();
  const captures = [];
  wait(world, delay, captures);
  let target = null;
  let lastRoom = null;
  let lastCard = false;
  let officeKO = false;
  while (!world.over) {
    const p = world.player;
    const room = world.room;
    let keys = {};
    if (world.solitary.phase) keys.interact = !world.interactWasHeld;
    else if (world.grab) keys.action = !world.actionWasHeld; // All policies try to mash free.
    else if (world.hold) keys.action = !world.actionWasHeld;
    else {
      if (room.id !== lastRoom || p.hasKeycard !== lastCard || !target) {
        lastRoom = room.id;
        lastCard = p.hasKeycard;
        const routes = { 'cell-block': 'cb-east', 'mess-hall': 'mh-east', stairwell: 'sw-door' };
        if (p.hasKeycard) {
          target = room.id === 'cell-block' ? { kind: 'bed', x: 4.5 }
            : { kind: 'portal', ...room.portals.find((q) => q.id === 'go-drop') };
        } else if (room.id === 'guard-office') {
          target = { kind: 'card', x: 10.5 };
        } else {
          const portal = room.portals.find((q) => q.id === routes[room.id]);
          target = portal && { kind: 'portal', ...portal, x: portalX(room, portal) };
        }
      }
      if (!target) throw new Error(`no target in ${room.id}`);
      const delta = target.x - p.x;
      if (p.hiddenIn) {
        if (target.kind === 'bed' && p.hiddenIn === 'bed') keys.interact = !world.interactWasHeld;
        else keys.up = !world.upWasHeld;
      } else if (Math.abs(delta) > (target.type === 'hall' ? 0.005 : 0.35)) {
        keys.moveX = Math.sign(delta);
        keys.run = type !== 'Careless';
      } else if (target.kind === 'bed') {
        if (canSleep(world)) keys.interact = !world.interactWasHeld;
        else keys.up = !world.upWasHeld;
      } else if (target.kind === 'card') {
        keys.interact = !world.interactWasHeld; // Tap, then leave quickly.
      } else if (target.type === 'hall') keys.moveX = target.side === 'left' ? -1 : 1;
      else keys.up = !world.upWasHeld; // Fast creaky door.
      if (type === 'Knockout-heavy') {
        // Prefer pulls/drops whenever available; otherwise grab any valid target and shove on contact.
        const takedown = pullInTarget(world) || dropTarget(world) || grabTarget(world);
        const nearby = world.guards.some((g) => g.state !== 'out' && Math.abs(g.x - p.x) < 1.3);
        if (takedown || nearby) keys.action = !world.actionWasHeld;
        // Specifically approach the sleeper before collecting the card, matching Adam's habit.
        if (room.id === 'guard-office' && !officeKO) {
          const sleeper = world.guards.find((g) => g.id === 'go-guard');
          if (sleeper.state === 'out') officeKO = true;
          else {
            keys.interact = false;
            keys.moveX = Math.abs(sleeper.x - p.x) > 0.85 ? Math.sign(sleeper.x - p.x) : 0;
          }
        }
      }
    }
    tick(world, keys, captures);
  }
  return { type, delay, ...scoreRun(world), captures, routeUsed: [...world.visited] };
}
const runs = [];
for (let i = 0; i < 30; i += 1) {
  const delay = i * 0.5;
  for (const type of ['Ghost', 'Knockout-heavy', 'Rusher', 'Careless', 'Vent-first', 'Yard roof route']) {
    runs.push(type in tapes ? replay(type, delay) : reactive(type, delay));
  }
}
const mean = (list, key) => list.reduce((sum, r) => sum + key(r), 0) / list.length;
const summary = Object.fromEntries([...new Set(runs.map((r) => r.type))].map((type) => {
  const list = runs.filter((r) => r.type === type);
  const wins = list.filter((r) => r.won);
  const catches = {};
  for (const run of list) for (const c of run.captures) catches[c.room] = (catches[c.room] ?? 0) + 1;
  return [type, {
    runs: list.length, wins: wins.length, cleanWins: wins.filter((r) => r.timesSpotted === 0).length,
    averageTimeLeft: mean(list, (r) => r.timeLeft),
    winnerTimeLeft: wins.length ? mean(wins, (r) => r.timeLeft) : null,
    spottedBy: Object.fromEntries(Object.keys(list[0].spottedBy).map((k) => [k, mean(list, (r) => r.spottedBy[k])])),
    solitary: list.filter((r) => r.solitary).length,
    takedowns: Object.fromEntries(Object.keys(list[0].takedowns).map((k) => [k, mean(list, (r) => r.takedowns[k])])),
    captures: catches,
  }];
}));
emit(outputPath, { dt: DT, departureDelays: '0 to 14.5 seconds, step 0.5', summary, runs });
console.log(JSON.stringify(summary, null, 2));
