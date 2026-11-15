// How a run ends, and the score and rank shown afterwards.
import { CONFIG } from './config.js';
import { announce, announcementsBetween, tickBetween } from './cues.js';
import { caughtHowText } from './caught.js';
import { silentAlarmReason } from './keycard.js';

export const RANKS = Object.freeze({
  ghost: { name: 'Ghost', means: 'never spotted, no knockouts' },
  shadow: { name: 'Shadow', means: 'never spotted' },
  inmate: { name: 'Inmate', means: 'made it back' },
  caught: { name: 'Caught', means: 'did not make it back' },
});

export function rankFor({ won, timesSpotted, knockouts }) {
  if (!won) return 'caught';
  if (timesSpotted === 0 && knockouts === 0) return 'ghost';
  if (timesSpotted === 0) return 'shadow';
  return 'inmate';
}

export function scoreRun(world) {
  const won = world.over === 'win';
  const { timesSpotted, knockouts, bodiesFound } = world.stats;
  return {
    outcome: world.over,
    won,
    rank: rankFor({ won, timesSpotted, knockouts }),
    timeLeft: world.timeLeft,
    timesSpotted,
    knockouts,
    bodiesFound,
    // Knockouts by how they were done, and the rest of the takedown tally.
    takedowns: { ...world.stats.takedowns },
    slams: world.stats.slams,
    interrogations: world.stats.interrogations,
    checkInsFaked: world.stats.checkInsFaked,
    // Why the trip home went the way it did.
    silentAlarm: world.silentAlarm,
    silentAlarmReason: silentAlarmReason(world),
    // 'slow', 'fast', or null if the keycard was never taken.
    keycardGrab: world.keycardGrab,
    endedIn: world.room.name,
    caughtIn: world.over === 'caught' ? world.room.name : null,
    // Seconds from the "!" to the grab that ended the run, and what the "!" was for.
    caughtHow: world.over === 'caught' ? caughtHowText(world) : null,
  };
}

// outcome: 'win', 'caught' (grabbed twice), 'headcount' (out of bed at 0:00),
// or 'empty-handed' (in bed at 0:00 without the keycard).
export function endRun(world, outcome) {
  if (world.over) return;
  world.over = outcome;
  world.grab = null;
  world.result = scoreRun(world);
  world.events.push({ type: outcome === 'win' ? 'win' : 'lose' });
  if (outcome === 'caught') world.events.push({ type: 'caught' });
}

export const inBed = (world) => world.player.hiddenIn === 'bed';

// The "Sleep" action: in bed with the keycard, and nobody hunting you.
export function canSleep(world) {
  const hunted = world.allGuards.some((guard) => guard.state === 'alert');
  return inBed(world) && world.player.hasKeycard && !hunted;
}

export function updateTimer(world, dt, cfg = CONFIG) {
  // The gym is for practice: no headcount.
  if (world.layout.practice) return;
  const before = world.timeLeft;
  world.timeLeft = Math.max(0, world.timeLeft - dt);
  // A warning at one minute, then a tick for each of the last ten seconds.
  if (before > cfg.timerWarningSeconds && world.timeLeft <= cfg.timerWarningSeconds) {
    world.events.push({ type: 'timerWarning' });
  }
  if (world.timeLeft > 0 && world.timeLeft <= 10 && Math.ceil(before) !== Math.ceil(world.timeLeft)) {
    world.events.push({ type: 'timerTick' });
  }
  // The PA, and a tick through the last minute that speeds up.
  for (const entry of announcementsBetween(before, world.timeLeft, cfg)) announce(world, entry, cfg);
  if (tickBetween(before, world.timeLeft, cfg)) world.events.push({ type: 'clockTick' });
  if (world.timeLeft > 0) return;
  if (!inBed(world)) endRun(world, 'headcount');
  else endRun(world, world.player.hasKeycard ? 'win' : 'empty-handed');
}

// The debug keys: moves the timer by `change` seconds. Going down, the last PA announcement
// that was skipped over still plays, so the cues can be checked without waiting.
export function jumpTimer(world, change, cfg = CONFIG) {
  const before = world.timeLeft;
  world.timeLeft = Math.max(1, world.timeLeft + change);
  const skipped = announcementsBetween(before, world.timeLeft, cfg);
  if (skipped.length > 0) announce(world, skipped.at(-1), cfg);
}

export const startingSeconds = (cfg = CONFIG) => cfg.headcountSeconds;
