// The score screen shown when a run ends.
import { formatClock } from '../game/clock.js';
import { spottedByText, takedownText } from '../game/playtest.js';
import { RANKS, outcomeText } from '../game/run.js';

const HEADLINES = {
  win: 'BACK IN BED',
  caught: 'CAUGHT',
  headcount: 'HEADCOUNT',
  'empty-handed': 'HEADCOUNT',
};
const KEYCARD = { slow: 'Taken slowly (quiet)', fast: 'Grabbed fast' };
// The room is shown when the run ended somewhere other than your bed.
const WHERE_LABELS = { caught: 'Caught in', headcount: 'Out of bed in' };
export function createEndScreen(onPlayAgain) {
  const byId = (id) => document.getElementById(id);
  const screen = byId('end-screen');
  byId('play-again').addEventListener('click', onPlayAgain);
  let shown = null;

  // allowed is false while another screen, such as the playtest form, is open on top.
  function update(world, allowed = true) {
    const { result } = world;
    screen.hidden = !result || !allowed;
    if (!result || shown === result) return;
    shown = result;
    screen.dataset.outcome = result.won ? 'win' : 'lose';
    byId('end-headline').textContent = HEADLINES[result.outcome];
    // The line matches the rank: only a Ghost win says nobody knows.
    byId('end-detail').textContent = outcomeText(result.outcome, result.rank);
    byId('end-rank').textContent = RANKS[result.rank].name;
    byId('end-rank-means').textContent = RANKS[result.rank].means;
    byId('score-time').textContent = formatClock(result.timeLeft);
    byId('score-spotted').textContent = result.timesSpotted;
    byId('score-spotted-by').textContent = spottedByText(result.spottedBy);
    byId('score-knockouts').textContent = result.knockouts;
    byId('score-bodies').textContent = result.bodiesFound;
    byId('score-takedowns').textContent = takedownText(result.takedowns);
    byId('score-slams').textContent = result.slams;
    byId('score-shoves').textContent = result.shoves;
    byId('score-shoved-off').textContent = result.shovedOff;
    byId('score-interrogations').textContent = result.interrogations;
    byId('score-faked').textContent = result.checkInsFaked;
    byId('score-solitary').textContent = result.solitary ? `Yes: ${formatClock(result.solitaryPenalty)} lost` : 'No';
    byId('score-keycard').textContent = KEYCARD[result.keycardGrab] ?? 'Not taken';
    byId('score-alarm').textContent = result.silentAlarm ? `Yes: ${result.silentAlarmReason}` : 'No';
    byId('score-where-row').hidden = !WHERE_LABELS[result.outcome];
    byId('score-where-label').textContent = WHERE_LABELS[result.outcome] ?? '';
    byId('score-where').textContent = result.endedIn;
    byId('score-how-row').hidden = !result.caughtHow;
    byId('score-how').textContent = result.caughtHow ?? '';
  }
  return { update };
}
