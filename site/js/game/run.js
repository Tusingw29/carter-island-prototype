// How a run ends, and the score and rank shown afterwards.
import { CONFIG } from './config.js';

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

export function updateTimer(world, dt) {
  world.timeLeft = Math.max(0, world.timeLeft - dt);
  if (world.timeLeft > 0) return;
  if (!inBed(world)) endRun(world, 'headcount');
  else endRun(world, world.player.hasKeycard ? 'win' : 'empty-handed');
}

export const startingSeconds = (cfg = CONFIG) => cfg.headcountSeconds;
