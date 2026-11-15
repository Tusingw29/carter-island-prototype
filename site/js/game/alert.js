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
// roomId is the room it happens in. Left out, it is the room the player is in.
// cause says what set it off, for the score screen: { kind, guard }.
export function raiseAlarm(world, x, reason, cfg = CONFIG.guard, roomId = world.room.id, cause = null) {
  const here = world.allGuards.filter((guard) => guard.roomId === roomId);
  const alreadyAlert = here.some((guard) => guard.state === 'alert');
  // A guard the player is holding stays held, whatever the others do.
  for (const guard of here.filter((entry) => isConscious(entry) && entry.state !== 'held')) {
    // Seen is not caught: a guard who was not already chasing freezes for a moment first.
    if (guard.state !== 'alert') guard.react = cfg.reactSeconds;
    guard.lastKnownX = x;
    guard.detection = 1;
    guard.checkingSpotId = null;
    guard.stirTimer = 0;
    guard.lostFor = 0;
    guard.lunge = 0;
    if (reason === 'sight') guard.trackTimer = cfg.trackSeconds;
    setState(world, guard, 'alert');
  }
  world.searchClaims = new Set();
  if (alreadyAlert) return;
  if (reason === 'sight') world.stats.timesSpotted += 1;
  world.lastAlarm = {
    at: world.time, kind: cause?.kind ?? reason, by: cause?.guard?.label ?? null, roomId,
  };
}

// The empty-bed alarm: every guard in the prison goes Alert. They do not know where you are,
// so each one starts hunting from where he stands, and all of them stay on edge afterwards.
export function alarmEverywhere(world) {
  for (const guard of world.allGuards.filter(isAwake)) {
    guard.lastKnownX = guard.x;
    guard.detection = 1;
    guard.wary = true;
    guard.react = CONFIG.guard.reactSeconds;
    guard.lostFor = 0;
    // A guard who has walked next door on a radio check still has to walk home afterwards.
    if (guard.duty?.type !== 'radio') guard.duty = null;
    setState(world, guard, 'alert');
  }
  world.searchClaims = new Set();
  world.stats.timesSpotted += 1;
  world.lastAlarm = { at: world.time, kind: 'emptyBed', by: null, roomId: world.room.id };
  world.events.push({ type: 'lockdown' });
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
