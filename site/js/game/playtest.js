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

function runLine(result) {
  if (!result) return 'Run: not finished';
  return `Run: ${result.won ? 'made it back' : 'did not make it back'}, rank ${RANKS[result.rank].name}, `
    + `${formatClock(result.timeLeft)} left, spotted ${result.timesSpotted}, `
    + `knockouts ${result.knockouts}, bodies found ${result.bodiesFound}`
    + `\nKeycard: ${KEYCARD[result.keycardGrab] ?? 'not taken'}. `
    + `Silent alarm: ${result.silentAlarm ? `yes, ${result.silentAlarmReason}` : 'no'}.`
    + (result.caughtIn ? ` Caught in: ${result.caughtIn}.` : '');
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
