// Tunable numbers for the whole game live here, so playtest tuning is one-file work.
// Distances are in metres, speeds in metres per second, times in seconds.
export const CONFIG = Object.freeze({
  // Length of a run. The spec says tune this between 8 and 10 minutes.
  headcountSeconds: 9 * 60,
  headcountMinSeconds: 8 * 60,
  headcountMaxSeconds: 10 * 60,

  // The single bed check happens when this much time is left.
  bedCheckAtSecondsRemaining: 5 * 60,

  player: Object.freeze({
    walkSpeed: 3.2,
    runSpeed: 6.5,
    crouchSpeed: 1.5,
    standHeight: 1.7,
    crouchHeight: 0.9,
    // Keeps the player this far from the room's end walls.
    wallMargin: 0.5,
  }),

  // How far each kind of movement can be heard.
  noise: Object.freeze({
    walkRadius: 2.5,
    runRadius: 8,
    crouchRadius: 0,
  }),

  guard: Object.freeze({
    walkSpeed: 1.5,
    turnPauseSeconds: 1.2,
    eyeHeight: 1.5,
    // The flashlight cone IS the vision cone.
    coneRange: 7,
    coneHalfAngleDeg: 17,
    coneTiltDownDeg: 12,
  }),

  hide: Object.freeze({
    // How close you must stand to a hiding spot to get in.
    reach: 0.9,
  }),

  stick: Object.freeze({
    moveDeadzone: 0.35,
    upDownThreshold: 0.6,
    triggerThreshold: 0.3,
  }),
});
