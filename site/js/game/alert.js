// Alert levels and the changes between them: Calm, Suspicious, Alert, Searching, back to Calm.
// Every change goes through this file and adds an event, so sound and tests can follow along.
import { CONFIG } from './config.js';
import { isAwake, isConscious } from './guard.js';

// Lowest to highest. The on-screen meter shows the highest level among all guards.
export const LEVELS = ['calm', 'suspicious', 'searching', 'alert'];

function setState(world, guard, state) {
  if (guard.state === state) return;
  guard.state = state;
  world.events.push({ type: state, guardId: guard.id, roomId: guard.roomId });
}

// A guard heard or glimpsed something at x and walks over to check.
export function makeSuspicious(world, guard, x) {
  if (!isAwake(guard) || guard.state === 'alert') return;
  guard.targetX = x;
  guard.lookTimer = 0;
  guard.lookFlipped = false;
  guard.checkingSpotId = null;
  setState(world, guard, 'suspicious');
}

// The alarm: every conscious guard goes Alert and heads for x.
// reason is 'sight' (the player was clearly seen) or 'body' (a body was found).
export function raiseAlarm(world, x, reason, cfg = CONFIG.guard) {
  const alreadyAlert = world.guards.some((guard) => guard.state === 'alert');
  for (const guard of world.guards.filter(isConscious)) {
    guard.lastKnownX = x;
    guard.detection = 1;
    guard.checkingSpotId = null;
    guard.stirTimer = 0;
    if (reason === 'sight') guard.trackTimer = cfg.trackSeconds;
    setState(world, guard, 'alert');
  }
  world.searchClaims = new Set();
  if (reason === 'sight' && !alreadyAlert) world.stats.timesSpotted += 1;
}

// A chasing guard lost the player and starts hunting nearby hiding spots.
export function beginSearch(world, guard, cfg = CONFIG.guard) {
  guard.searchOrigin = guard.lastKnownX ?? guard.x;
  guard.searchTimer = cfg.searchSeconds;
  guard.checkingSpotId = null;
  guard.knownSpotId = null;
  guard.lookTimer = 0;
  guard.lookFlipped = false;
  setState(world, guard, 'searching');
}

export function calmDown(world, guard) {
  guard.detection = 0;
  guard.targetX = null;
  guard.checkingSpotId = null;
  guard.knownSpotId = null;
  guard.pause = 0;
  setState(world, guard, 'calm');
}

// The level to show for a guard. After the silent alarm, a calm guard shows as Suspicious.
export function shownState(guard) {
  return guard.state === 'calm' && guard.wary ? 'suspicious' : guard.state;
}

// What the alert meter shows: the highest level among the guards and how full the bar is.
export function alertSummary(world, cfg = CONFIG.guard) {
  const guards = world.guards.filter(isAwake);
  let level = 'calm';
  for (const guard of guards) {
    if (LEVELS.indexOf(shownState(guard)) > LEVELS.indexOf(level)) level = shownState(guard);
  }
  let fill = Math.max(0, ...guards.map((guard) => guard.detection));
  if (level === 'alert') fill = 1;
  if (level === 'searching') {
    const left = Math.max(0, ...guards.filter((guard) => guard.state === 'searching').map((g) => g.searchTimer));
    fill = left / cfg.searchSeconds;
  }
  return { level, fill };
}
