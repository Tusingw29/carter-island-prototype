// Works out the one hint to show over the world right now, such as "UP: hide".
import { interactTarget } from './interact.js';
import { keycardInReach } from './keycard.js';
import { dragTarget, knockoutTarget, stuffTarget, tooRiskyNow } from './knockout.js';
import { canSleep, inBed } from './run.js';
import { snitchInReach } from './snitch.js';
import { upTarget } from './targets.js';
import { ventState } from './vents.js';

const SPOT_HEIGHT = { cart: 1.9, bed: 1.6, table: 1.9, counter: 2, desk: 1.9 };

function ventText(world, portal) {
  const state = ventState(world, portal);
  if (state === 'locked') return 'Vent cover, screwed shut';
  if (state === 'exitOnly') return 'Vent cover';
  return portal.oneWay ? 'UP: open the vent and drop down (one way)' : 'UP: climb into the vent';
}

function portalText(world, portal) {
  if (portal.type === 'vent') return ventText(world, portal);
  if (portal.creaky) return 'UP: tap = fast and loud, hold = slow and quiet';
  if (portal.type === 'stairs') return `UP: stairs ${portal.dir}`;
  return 'UP: open door';
}

// Returns { text, x, y } in world metres, or null when there is nothing to do here.
export function currentPrompt(world) {
  const { player } = world;
  if (world.grab || world.over) return null;
  if (tooRiskyNow(world)) {
    const risky = world.allGuards.find((guard) => guard.id === world.risky.guardId);
    return { text: 'TOO RISKY', x: risky.x, y: 2.75, shake: true };
  }
  if (player.hiddenIn) {
    if (canSleep(world)) return { text: 'E: sleep (end the run)   UP: get up', x: player.x, y: 1.6 };
    return { text: inBed(world) ? 'UP: get up' : 'UP: come out', x: player.x, y: inBed(world) ? 1.6 : 2.75 };
  }
  if (player.dragging) {
    const spot = stuffTarget(world);
    if (spot) return { text: 'UP: stuff body in', x: spot.x, y: 2.75 };
    return { text: 'SPACE: drop body', x: player.x, y: 2.3 };
  }
  const card = keycardInReach(world);
  if (card) return { text: 'E: tap = grab fast, hold = lift quietly', x: card.x, y: 1.9 };
  const action = interactTarget(world);
  if (action?.kind === 'pickup') return { text: `E: take the ${action.item.type}`, x: action.item.x, y: 1.6 };
  if (action?.kind === 'panel') return { text: 'E: camera control panel', x: action.panel.x, y: 2.4 };
  if (action?.kind === 'dummy') return { text: 'E: make a dummy in your bed', x: player.x, y: 2.3 };
  const snitch = snitchInReach(world);
  if (snitch?.cellOpen) return { text: 'SPACE: knock out', x: snitch.x, y: 3 };
  const guard = knockoutTarget(world);
  if (guard) return { text: 'SPACE: knock out', x: guard.x, y: 2.75 };
  const body = dragTarget(world);
  if (body) return { text: 'SPACE: drag body', x: body.x, y: 1.2 };
  const target = upTarget(world);
  if (target?.kind === 'cell') {
    const text = player.hasKeycard ? 'UP: open his cell with the keycard' : 'Snitch. His cell is locked';
    return { text, x: target.snitch.x, y: 3 };
  }
  if (!target && action?.kind === 'trader') {
    const text = player.hasCigarettes ? 'E: trade the cigarettes' : 'E: talk to the trader';
    return { text, x: action.trader.x, y: 3 };
  }
  if (!target) return null;
  if (target.kind === 'portal') {
    const { portal } = target;
    const y = portal.floor || world.room.crawl ? 1.5 : (portal.type === 'vent' && !portal.high ? 1.9 : 3);
    return { text: portalText(world, portal), x: portal.x, y };
  }
  if (target.kind === 'prop') return { text: 'Vent cover, welded', x: target.prop.x, y: 1.9 };
  const { spot } = target;
  const text = spot.type === 'bed' ? 'UP: get in bed' : 'UP: hide';
  return { text, x: Math.max(spot.x - 2, Math.min(spot.x + 2, player.x)), y: SPOT_HEIGHT[spot.type] ?? 2.75 };
}
