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
    // Speed while dragging a body. You cannot run or crouch while dragging.
    dragSpeed: 1.8,
  }),

  // How far each kind of movement can be heard.
  noise: Object.freeze({
    walkRadius: 2.5,
    runRadius: 8,
    crouchRadius: 0,
    dragRadius: 1.5,
  }),

  guard: Object.freeze({
    walkSpeed: 1.5,
    turnPauseSeconds: 1.2,
    eyeHeight: 1.5,
    // The flashlight cone IS the vision cone.
    coneRange: 7,
    coneHalfAngleDeg: 17,
    coneTiltDownDeg: 12,

    // Speeds for each alert level. Alert is faster than your walk but slower than your run.
    suspiciousSpeed: 2.2,
    alertSpeed: 5,
    searchSpeed: 2.4,

    // Sight fills a detection meter. Full meter = Alert. Close up it fills fast.
    detectNearDistance: 2,
    detectNearSeconds: 0.3,
    detectFarSeconds: 1.3,
    detectDrainPerSecond: 0.5,
    // Meter level at which a calm guard gets Suspicious and comes to look.
    glimpseThreshold: 0.3,
    suspiciousDetectBoost: 1.5,
    searchingDetectBoost: 3,

    // How long a guard looks around at a spot before giving up.
    lookAroundSeconds: 3,
    // After losing sight, a chasing guard still knows where you are for this long.
    trackSeconds: 1,
    // Searching: checks hiding spots this close to where he lost you.
    searchRadius: 7,
    checkSpotSeconds: 1.5,
    searchSeconds: 20,

    grabReach: 0.8,
    stunSeconds: 2.5,
    // A guard always notices someone this close in front of him, even below his beam.
    closeSightDistance: 1.2,
    // A sleeping guard who is disturbed wakes up this long after, if you are still in the room.
    stirSeconds: 4,
  }),

  // Tap or hold, for creaky doors and the keycard.
  hold: Object.freeze({
    tapSeconds: 0.25,
    slowSeconds: 2,
  }),

  door: Object.freeze({
    reach: 0.9,
    // How far a creaky door is heard when opened fast, on both sides of it.
    slamRadius: 12.5,
  }),

  camera: Object.freeze({
    // How long you can be in a camera's view before it registers you.
    noticeSeconds: 0.35,
    cooldownSeconds: 4,
  }),

  item: Object.freeze({
    reach: 1,
  }),

  vent: Object.freeze({
    // The thud when you drop out of a vent.
    landRadius: 3,
    grateReach: 0.9,
  }),

  // How long an on-screen message stays up.
  messageSeconds: 3.5,

  knockout: Object.freeze({
    reach: 1.1,
  }),

  // Getting grabbed: mash to break free, once per run.
  grab: Object.freeze({
    mashNeeded: 8,
    mashSeconds: 3,
    shoveDistance: 2,
    immunitySeconds: 1.5,
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
