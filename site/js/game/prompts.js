// Works out the one hint to show over the world right now, such as "UP: hide".
import { interactTarget } from './interact.js';
import { keycardInReach } from './keycard.js';
import { almostGrabTarget, dragTarget, knockoutTarget, stuffTarget, tooRiskyNow } from './knockout.js';
import { canSleep, inBed } from './run.js';
import { isStaggering, ledgeFor, shoveReady, shoveTarget } from './shove.js';
import { dropTarget, grabTarget, pullInTarget } from './takedown.js';
import { throwableName } from './throwing.js';
import { snitchInReach } from './snitch.js';
import { upTarget } from './targets.js';
import { ventState } from './vents.js';

const SPOT_HEIGHT = { cart: 1.9, bed: 1.6, table: 1.9, counter: 2, desk: 1.9, bleachers: 1.5 };

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
  if (portal.type === 'window') return 'UP: climb through the window';
  if (portal.type === 'hatch') return portal.y > 0 ? 'UP: open the hatch and climb down' : 'UP: climb up to the hatch';
  if (portal.locked) return 'The door to solitary. Locked';
  if (portal.exitOnly) return 'Door, latched from the inside';
  return 'UP: open door';
}

const REFUSED = {
  notReady: 'SHOVE NOT READY',
  unaware: "He hasn't seen you: grab instead",
  closer: 'Move closer to grab',
};
const over = (guard) => ({ x: guard.x, y: (guard.y ?? 0) + 2.75 });

// "him", or "the Tower 1 guard" when more than one guard is close enough to be the target, so
// the prompt always says who it means.
export function targetName(world, guard) {
  const { player } = world;
  const close = world.guards.filter((other) => (
    other.state !== 'out' && Math.abs(other.x - player.x) <= 2.5 && Math.abs((other.y ?? 0) - (player.y ?? 0)) <= 8
  ));
  return close.length > 1 ? `the ${guard.label ?? 'guard'}` : 'him';
}

// Where to go while a guard staggers. A room can name a good way out of a spot, such as the
// jump from Tower 1 to the roof ledge. Otherwise it is just "run".
export function escapeHint(world) {
  const { player, room } = world;
  const here = (room.escapeHints ?? []).find((hint) => (
    player.x >= hint.from && player.x <= hint.to && (player.y ?? 0) >= (hint.minY ?? 0)
  ));
  return here ? here.text : 'RUN / JUMP AWAY';
}

// Returns { text, x, y } in world metres, or null when there is nothing to do here.
export function currentPrompt(world) {
  const { player } = world;
  // No hints during the trip to solitary: the buttons do nothing then.
  if (world.grab || world.over || world.solitary.phase) return null;
  if (tooRiskyNow(world)) {
    const risky = world.allGuards.find((guard) => guard.id === world.risky.guardId);
    return { text: REFUSED[world.risky.why] ?? REFUSED.notReady, ...over(risky), shake: true };
  }
  // Holding a guard: the choices are shown in their own panel.
  if (world.hold) return null;
  if (player.hiddenIn) {
    // A guard watched you get in. Said at the spot, at once, and for as long as it is true.
    const watcher = world.guards.find((guard) => guard.knownSpotId === player.hiddenIn && guard.state !== 'out');
    if (watcher) {
      const text = watcher.reach > 0 ? 'HE IS REACHING IN!  UP: get out' : 'HE SAW YOU HIDE.  UP: get out';
      return { text, x: player.x, y: 2.75, shake: true };
    }
    const passing = pullInTarget(world);
    if (passing) return { text: 'SPACE: pull in', x: passing.x, y: (passing.y ?? 0) + 2.75 };
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
  if (action?.kind === 'pickup') {
    const name = action.item.type === 'boots' ? 'work boots' : action.item.type;
    return { text: `E: take the ${name}`, x: action.item.x, y: 1.6 };
  }
  if (action?.kind === 'throwable') {
    const name = throwableName(action.item);
    const text = player.carrying ? `Hands full (the ${name} stays)` : `E: pick up the ${name}`;
    return { text, x: action.item.x, y: (action.item.y ?? 0) + 1.6 };
  }
  if (action?.kind === 'panel') return { text: 'E: camera control panel', x: action.panel.x, y: 2.4 };
  if (action?.kind === 'dummy') return { text: 'E: make a dummy in your bed', x: player.x, y: 2.3 };
  const snitch = snitchInReach(world);
  if (snitch?.cellOpen) return { text: 'SPACE: knock out', x: snitch.x, y: 3 };
  const guard = knockoutTarget(world);
  const named = (target) => (targetName(world, target) === 'him' ? '' : ` ${targetName(world, target)}`);
  // A guard reeling from a shove: get away, or grab him while it lasts.
  const reeling = world.guards.find((other) => isStaggering(other) && other.state !== 'held');
  if (reeling && guard === reeling) return { text: `SPACE: grab${named(reeling)}`, ...over(reeling) };
  if (reeling && !guard) return { text: `${escapeHint(world)}, or SPACE: grab`, ...over(reeling) };
  if (guard && grabTarget(world)) return { text: `SPACE: grab${named(guard)}`, ...over(guard) };
  // Behind him but just out of reach: say so, so Space is never a surprise.
  const almost = almostGrabTarget(world);
  if (almost) return { text: 'Move closer to grab', ...over(almost) };
  const below = dropTarget(world);
  if (below) return { text: `SPACE: drop on ${targetName(world, below)}`, ...over(below) };
  const facing = shoveTarget(world);
  if (facing && shoveReady(world)) {
    // Near the edge of his platform, a shove sends him off it.
    const text = ledgeFor(world, facing) ? 'R: shove off' : 'R: shove';
    return { text: `${text}${named(facing)}`, ...over(facing) };
  }
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
    return { text: portalText(world, portal), x: portal.x, y: y + (portal.y ?? 0) };
  }
  if (target.kind === 'prop') {
    const text = target.prop.type === 'outer-wall' ? 'The outer wall' : 'Vent cover, welded';
    return { text, x: Math.min(target.prop.x, player.x), y: 2.4 };
  }
  const { spot } = target;
  const text = spot.type === 'bed' ? 'UP: get in bed' : (spot.type === 'bleachers' ? 'UP: hide under' : 'UP: hide');
  return { text, x: Math.max(spot.x - 2, Math.min(spot.x + 2, player.x)), y: SPOT_HEIGHT[spot.type] ?? 2.75 };
}
