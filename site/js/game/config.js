// Tunable numbers for the whole game live here, so playtest tuning is one-file work.
// Distances are in metres, speeds in metres per second, times in seconds.
export const CONFIG = Object.freeze({
  // Length of a run. The spec started at 9:00. Playtest 2 brought it down to 7:00.
  headcountSeconds: 7 * 60,
  headcountMinSeconds: 7 * 60,
  headcountMaxSeconds: 10 * 60,

  // A warning sounds when this much time is left.
  timerWarningSeconds: 60,

  // PA announcements and wall clocks, which make the timer felt.
  pa: Object.freeze({
    headcountMinutes: Object.freeze([5, 2, 1]),
    // "Bed check" is announced this long before the bed check starts.
    bedCheckWarningSeconds: 8,
    showSeconds: 5,
    // Wall clocks are never further apart than this, so one is always on screen.
    clockSpacing: 14,
    clockClearance: 1.7,
  }),

  // The picture's camera. See framing.js for the modes.
  view: Object.freeze({
    fovDeg: 32,
    closeDistance: 15,
    // Twice as far back shows twice as much floor.
    wideDistance: 30,
    followSharpness: 10,
    zoomSharpness: 3.5,
    // Close, wide, and smart show this far past the room's ends. Room mode stops at the walls.
    followPastWall: 1,
    wallThickness: 0.5,
    // Room mode pulls back up to this much further than wide if that gets the whole room in.
    roomFitSlack: 1.15,
    // Room mode starts this much closer in when you enter a room, then eases out.
    roomEntryZoom: 0.75,
    // Smart mode closes in when a guard is this near, and pulls back once he is this far.
    guardNearMetres: 4.5,
    guardFarMetres: 6.5,
    tightHoldSeconds: 1.2,
  }),

  // The single bed check happens when this much time is left.
  bedCheckAtSecondsRemaining: 3.5 * 60,

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
    // Gym moves. Landing is a small noise, a slide is quiet, a dash is the loudest thing you can do.
    landRadius: 1.5,
    slideRadius: 1,
    dashRadius: 11,
  }),

  guard: Object.freeze({
    walkSpeed: 1.5,
    turnPauseSeconds: 1.2,
    eyeHeight: 1.5,
    // The flashlight cone IS the vision cone.
    coneRange: 7,
    coneHalfAngleDeg: 17,
    coneTiltDownDeg: 12,

    // Speeds for each alert level. A chasing guard runs at 80% of your run speed: faster than
    // your walk, but a running player always pulls away.
    suspiciousSpeed: 2.2,
    alertSpeed: 5.2,
    searchSpeed: 2.4,

    // Seen is not caught. A guard who goes Alert freezes for this long first: your head start.
    reactSeconds: 0.6,
    // A grab is a lunge. It starts when you are this close, takes this long to wind up, then
    // carries him this far forward. Run and you are gone before it lands. Walk and it gets you.
    lungeTriggerRange: 1.2,
    lungeWindupSeconds: 0.35,
    lungeDistance: 1.8,
    // A lunge that misses leaves him stumbling for this long.
    lungeMissSeconds: 0.9,
    // A chasing guard who has not seen you for this long gives up the chase and starts searching.
    loseSightSeconds: 2,

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
    // A guard cannot grab someone whose feet are higher than this above him.
    grabReachUp: 1.2,
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

  // How long an on-screen message stays up. Hints from the trader stay longer.
  messageSeconds: 3.5,
  alarmMessageSeconds: 8,
  hintSeconds: 10,

  // Snitch inmates watch a short stretch of floor on one side of their cell, then the other.
  snitch: Object.freeze({
    range: 2.6,
    // Right at the bars they cannot see you. This is where you wait for them to look away.
    blindSpot: 0.6,
    lookSeconds: 4,
    noticeSeconds: 0.3,
    cooldownSeconds: 5,
    reach: 0.9,
  }),

  bedCheck: Object.freeze({
    // How long the guard looks at your bed before deciding.
    lookSeconds: 1.5,
  }),

  knockout: Object.freeze({
    reach: 1.1,
    // You cannot start a knockout from higher than this above the floor.
    reachUp: 0.3,
    // How long "TOO RISKY" shows when you try it on a guard who can see you.
    riskySeconds: 0.6,
    // A knocked-out guard wakes up after this long.
    wakeSeconds: 75,
    // A guard lying in the open starts to stir this long before he wakes, and you are told.
    wakeWarningSeconds: 6,
    // A guard stuffed in a locker or cart bangs on it for this long before he climbs out.
    bangSeconds: 4,
    bangEverySeconds: 0.8,
    bangRadius: 10,
  }),

  // Radio check-ins. The first guard calls in at firstSeconds, the next staggerSeconds later,
  // and so on. Each guard then calls in again every intervalSeconds.
  radio: Object.freeze({
    firstSeconds: 20,
    staggerSeconds: 8,
    intervalSeconds: 60,
    showSeconds: 2,
  }),

  // How a knockout feels. All of it is drawing and sound: none of it changes the rules.
  feel: Object.freeze({
    hitStopSeconds: 0.08,
    flashSeconds: 0.12,
    fallSeconds: 0.28,
    shakeSeconds: 0.25,
    shakeMetres: 0.14,
  }),

  // Jump, slide, and dash. Only in the gym (?room=gym) for now.
  moves: Object.freeze({
    // A fast rise and a faster fall. Peak height is jumpSpeed squared over twice gravity: 1.29 m.
    jumpSpeed: 8.5,
    gravity: 28,
    fallGravity: 40,
    maxFallSpeed: 20,
    // Letting go of jump early drops the upward speed to this.
    jumpCutSpeed: 3,
    // A dash is a fixed burst: dashSpeed for dashSeconds, 3.5 m. In the air it holds its height.
    dashSpeed: 14,
    dashSeconds: 0.25,
    dashCooldownSeconds: 0.2,
    // A slide is slideSpeed for slideSeconds, 3.15 m, with the body only slideHeight tall.
    slideSpeed: 7,
    slideSeconds: 0.45,
    slideHeight: 0.6,
    bodyHalfWidth: 0.3,
    // Fall this far down a gap and you are put back on the edge.
    pitDepth: 3,
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
