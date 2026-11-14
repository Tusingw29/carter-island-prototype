// The score screen shown when a run ends.
import { formatClock } from '../game/clock.js';
import { RANKS } from '../game/run.js';

const HEADLINES = {
  win: 'BACK IN BED',
  caught: 'CAUGHT',
  headcount: 'HEADCOUNT',
  'empty-handed': 'HEADCOUNT',
};
const DETAILS = {
  win: 'You have the keycard, and nobody knows.',
  caught: 'Grabbed a second time.',
  headcount: 'Your bed was empty when they counted.',
  'empty-handed': 'You were in bed, but without the keycard.',
};

export function createEndScreen(onPlayAgain) {
  const byId = (id) => document.getElementById(id);
  const screen = byId('end-screen');
  byId('play-again').addEventListener('click', onPlayAgain);
  let shown = null;

  function update(world) {
    const { result } = world;
    screen.hidden = !result;
    if (!result || shown === result) return;
    shown = result;
    screen.dataset.outcome = result.won ? 'win' : 'lose';
    byId('end-headline').textContent = HEADLINES[result.outcome];
    byId('end-detail').textContent = DETAILS[result.outcome];
    byId('end-rank').textContent = RANKS[result.rank].name;
    byId('end-rank-means').textContent = RANKS[result.rank].means;
    byId('score-time').textContent = formatClock(result.timeLeft);
    byId('score-spotted').textContent = result.timesSpotted;
    byId('score-knockouts').textContent = result.knockouts;
    byId('score-bodies').textContent = result.bodiesFound;
  }
  return { update };
}
