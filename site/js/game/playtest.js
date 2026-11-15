// The playtest questions shown at the end of a run, and the text a player sends back.
import { formatClock } from './clock.js';
import { RANKS } from './run.js';

export const QUESTIONS = Object.freeze([
  'Did hiding while a guard walked by feel tense?',
  'Did the timer feel exciting, or just stressful?',
  'Did the vent shortcut feel like a reward?',
  'Did you want to play again to do it faster or cleaner?',
]);

const KEYCARD = { slow: 'taken slowly', fast: 'grabbed fast' };

const SOURCES = [
  ['guard', 'guards'], ['camera', 'cameras'], ['searchlight', 'searchlights'], ['snitch', 'snitches'],
  ['shove', 'your shoves'], ['brokeFree', 'a guard broke free'], ['sleeperWoke', 'sleeper woke'],
  ['emptyBed', 'empty bed'], ['other', 'other'],
];

// "guards 3, cameras 1, searchlights 0, snitches 2", then every other cause that happened, by
// name: "your shoves 1, empty bed 1". "other" is a guard you threw down or let go.
export function spottedByText(spottedBy = {}) {
  const always = SOURCES.slice(0, 4);
  const named = SOURCES.slice(4).filter(([key]) => (spottedBy[key] ?? 0) > 0);
  return [...always, ...named].map(([key, name]) => `${name} ${spottedBy[key] ?? 0}`).join(', ');
}

// "2 from behind, 1 from above, 0 pulled into hiding".
export function takedownText(takedowns = {}) {
  const fell = (takedowns.ledge ?? 0) > 0 ? `, ${takedowns.ledge} knocked out by a fall` : '';
  return `${takedowns.choke ?? 0} from behind, ${takedowns.above ?? 0} from above, `
    + `${takedowns.pullIn ?? 0} pulled into hiding${fell}`;
}

function runLine(result) {
  if (!result) return 'Run: not finished';
  return `Run: ${result.won ? 'made it back' : 'did not make it back'}, rank ${RANKS[result.rank].name}, `
    + `${formatClock(result.timeLeft)} left, spotted ${result.timesSpotted}, `
    + `knockouts ${result.knockouts}, bodies found ${result.bodiesFound}`
    + `\nSpotted by: ${spottedByText(result.spottedBy)}.`
    + `\nTakedowns: ${takedownText(result.takedowns)}. Thrown down: ${result.slams ?? 0}. `
    + `Shoves: ${result.shoves ?? 0}. `
    + `Shoved off ledges: ${result.shovedOff ?? 0}. `
    + `Interrogations: ${result.interrogations ?? 0}. Check-ins faked: ${result.checkInsFaked ?? 0}.`
    + `\nSolitary: ${result.solitary ? `yes, ${result.solitaryPenalty} s lost` : 'no'}.`
    + `\nKeycard: ${KEYCARD[result.keycardGrab] ?? 'not taken'}. `
    + `Silent alarm: ${result.silentAlarm ? `yes, ${result.silentAlarmReason}` : 'no'}.`
    + (result.caughtIn ? ` Caught in: ${result.caughtIn}.` : '')
    + (result.caughtHow ? `\nHow: ${result.caughtHow}` : '');
}

// answers is a list of strings, one per question, in order. extra is anything else they want to say.
export function playtestText(result, answers, extra = '') {
  const lines = ['Carter Island playtest', runLine(result), ''];
  QUESTIONS.forEach((question, index) => {
    lines.push(`${index + 1}. ${question}`, `   ${(answers[index] ?? '').trim() || '(no answer)'}`, '');
  });
  if (extra.trim()) lines.push('Anything else:', `   ${extra.trim()}`, '');
  return lines.join('\n').trimEnd();
}
