// Tunable numbers for the whole game live here, so playtest tuning is one-file work.
export const CONFIG = Object.freeze({
  // Length of a run. The spec says tune this between 8 and 10 minutes.
  headcountSeconds: 9 * 60,
  headcountMinSeconds: 8 * 60,
  headcountMaxSeconds: 10 * 60,

  // The single bed check happens when this much time is left.
  bedCheckAtSecondsRemaining: 5 * 60,
});
