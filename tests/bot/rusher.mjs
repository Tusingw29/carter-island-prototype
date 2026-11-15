// The rusher: a player who never sneaks. It runs the front-door route, taps doors and the
// keycard, drops home, and mashes if grabbed. It knows where to go but waits for nobody.
// Taken from the outside review (tools/review/playtests.mjs, the "Rusher" policy), so its runs
// can be compared with the review's 30 of 30 wins.
import { emptyIntent } from '../../site/js/game/intent.js';
import { portalX } from '../../site/js/game/portals.js';
import { canSleep, scoreRun } from '../../site/js/game/run.js';
import { CONFIG } from '../../site/js/game/config.js';
import { createWorld, stepWorld } from '../../site/js/game/world.js';

const DT = 1 / 120;
const WAY_OUT = { 'cell-block': 'cb-east', 'mess-hall': 'mh-east', stairwell: 'sw-door' };

function targetFor(world) {
  const { player, room } = world;
  if (player.hasKeycard) {
    if (room.id === 'cell-block') return { kind: 'bed', x: 4.5 };
    const drop = room.portals.find((portal) => portal.id === 'go-drop');
    if (drop) return { kind: 'portal', ...drop };
    // Sent somewhere unexpected (a guard's room): head back toward the Cell Block.
    const west = room.portals.find((portal) => portal.type === 'hall' && portal.side === 'left');
    return west ? { kind: 'portal', ...west, x: portalX(room, west) } : null;
  }
  if (room.id === 'guard-office') return { kind: 'card', x: 10.5 };
  const portal = room.portals.find((entry) => entry.id === WAY_OUT[room.id]);
  return portal ? { kind: 'portal', ...portal, x: portalX(room, portal) } : null;
}

// One step's buttons.
function decide(world) {
  const { player } = world;
  if (world.solitary.phase) return { interact: !world.interactWasHeld };
  if (world.grab || world.hold) return { action: !world.actionWasHeld };
  const target = targetFor(world);
  if (!target) return {};
  const delta = target.x - player.x;
  if (player.hiddenIn) {
    if (target.kind === 'bed' && player.hiddenIn === 'bed') return { interact: !world.interactWasHeld };
    return { up: !world.upWasHeld };
  }
  if (Math.abs(delta) > (target.type === 'hall' ? 0.005 : 0.35)) return { moveX: Math.sign(delta), run: true };
  if (target.kind === 'bed') return canSleep(world) ? { interact: !world.interactWasHeld } : { up: !world.upWasHeld };
  if (target.kind === 'card') return { interact: !world.interactWasHeld };
  if (target.type === 'hall') return { moveX: target.side === 'left' ? -1 : 1 };
  return { up: !world.upWasHeld };
}

// One whole run, leaving the bed `delay` seconds in. Returns the score plus what went wrong.
// cfg lets a trial value be tried without changing config.js.
export function rusherRun(delay = 0, cfg = CONFIG) {
  const world = createWorld();
  const captures = [];
  let grabs = 0;
  for (let i = 0; i < Math.round(delay / DT); i += 1) stepWorld(world, emptyIntent(), DT, cfg);
  while (!world.over) {
    const room = world.room.id;
    const used = world.solitary.used;
    const held = Boolean(world.grab);
    stepWorld(world, { ...emptyIntent(), ...decide(world) }, DT, cfg);
    if (!held && world.grab) grabs += 1;
    if (!used && world.solitary.used) captures.push({ room, kind: 'solitary', at: world.time });
    if (world.over === 'caught') captures.push({ room, kind: 'final', at: world.time });
    world.events.length = 0;
  }
  return { delay, ...scoreRun(world), heat: world.heat, grabs, captures, world };
}

// The review's 30 departures: 0 to 14.5 seconds in half-second steps.
export function rusherCohort(cfg = CONFIG) {
  const runs = Array.from({ length: 30 }, (_, i) => rusherRun(i * 0.5, cfg));
  const wins = runs.filter((run) => run.won);
  const mean = (list, key) => (list.length ? list.reduce((sum, run) => sum + key(run), 0) / list.length : null);
  const rooms = {};
  for (const run of runs) for (const capture of run.captures) rooms[capture.room] = (rooms[capture.room] ?? 0) + 1;
  return {
    runs: runs.length,
    wins: wins.length,
    meanTimeLeft: mean(runs, (run) => run.timeLeft),
    winnersTimeLeft: mean(wins, (run) => run.timeLeft),
    solitaryTrips: runs.filter((run) => run.solitary).length,
    finalCaptures: runs.filter((run) => run.outcome === 'caught').length,
    outOfTime: runs.filter((run) => run.outcome === 'headcount' || run.outcome === 'empty-handed').length,
    meanHeat: mean(runs, (run) => run.heat),
    meanGrabs: mean(runs, (run) => run.grabs),
    winsWithoutAGrab: wins.filter((run) => run.grabs === 0).length,
    captureRooms: rooms,
    all: runs,
  };
}
