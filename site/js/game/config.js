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
    // Up a tower or on a roof the camera lifts: by liftShare of your height above liftAbove.
    liftAbove: 1.6,
    liftShare: 0.75,
    liftSharpness: 4,
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
    // 70% of walking speed, and silent.
    crouchSpeed: 2.24,
    standHeight: 1.7,
    crouchHeight: 0.9,
    // Keeps the player this far from the room's end walls.
    wallMargin: 0.5,
    // Speed while dragging a body. You cannot run or crouch while dragging.
    dragSpeed: 1.8,
  }),

  // How far each kind of movement can be heard.
  noise: Object.freeze({
    // Walking is heard only from very close. Running is not.
    walkRadius: 1,
    runRadius: 8,
    crouchRadius: 0,
    dragRadius: 1.5,
    // Jumping and landing are small noises, a slide is quiet, a dash is the loudest thing you can do.
    jumpRadius: 1.5,
    landRadius: 1.5,
    // How much of a guard's hearing meter a small one-off noise (a jump, a landing) fills.
    // Enough for a glance, not enough to bring him over. A loud one-off noise fills it all.
    smallAmount: 0.5,
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
    // Up close it takes detectNearSeconds, at the far edge of the beam detectFarSeconds.
    // Crouching or standing still slows it (see awareness below).
    detectNearSeconds: 0.8,
    detectFarSeconds: 2,
    // Out of his sight the meter drains this slowly, so it is not safe to step straight back.
    detectDrainPerSecond: 0.35,
    // Meter level at which a calm guard gets Suspicious, turns to you, and comes to look.
    glimpseThreshold: 0.33,
    suspiciousDetectBoost: 1.5,
    searchingDetectBoost: 3,

    // Hearing fills a meter. Steady noise (footsteps) in earshot fills it in hearSeconds at the
    // edge of earshot, and up to twice as fast close by. It drains when you go quiet.
    hearSeconds: 1,
    hearDrainPerSecond: 0.5,
    // Past this much he glances back over his shoulder for a moment. Full, he comes to look.
    glanceAt: 0.4,
    glanceSeconds: 0.8,
    glanceCooldownSeconds: 3,

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
    // That close-awareness zone is drawn: it reaches this high above his feet.
    closeSightHeight: 2,
    // Solid things in his way. Cover up to this high he vaults, which takes this long. Anything
    // taller stops him.
    vaultMaxHeight: 1.4,
    vaultSeconds: 0.8,
    // Pulling you out of a hiding spot he watched you get into: he reaches in for this long first.
    reachInSeconds: 0.35,
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
    // How long a camera or a searchlight has to have you in view before it calls it in.
    fillSeconds: 1.2,
    // While you stay in view after that, it calls your position in again this often.
    cooldownSeconds: 4,
    // The beep while its meter fills: this far apart at first, this far apart when nearly full.
    beepSlowSeconds: 0.45,
    beepFastSeconds: 0.12,
    // How high the camera hangs. Its line of sight starts here.
    mountHeight: 3.5,
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
    // How long a snitch has to have you in view before he yells.
    fillSeconds: 1,
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
    // How long "SHOVE NOT READY" shows when you press the button on a guard too soon.
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

  // The shove: for a guard who can see you. It buys a moment to run, and it is not quiet.
  shove: Object.freeze({
    reach: 1.4,
    // Your feet must be within this much of his, up or down.
    reachUp: 0.6,
    stunSeconds: 1.5,
    pushMetres: 1,
    cooldownSeconds: 8,
    // About as loud as running.
    noiseRadius: 8,
  }),

  // Throwing things: cups, soap, and other small items lying around.
  throwing: Object.freeze({
    // It leaves the hand this high (lower when crouched), this fast, and falls under this gravity.
    // On flat ground that is a short arc of about 6 m.
    handHeight: 1.3,
    crouchHandHeight: 0.7,
    speedX: 9,
    speedY: 4.5,
    gravity: 20,
    // Where a guard's head is, measured up from his feet, and how wide.
    headBottom: 1.2,
    headTop: 1.95,
    headHalfWidth: 0.35,
    stunSeconds: 1.5,
    // How far the clatter of it landing is heard, unless the item says otherwise.
    noiseRadius: 6,
    // A bouncing item keeps this share of its speed, up and along, at each bounce.
    bounceUp: 0.55,
    bounceAlong: 0.7,
    reach: 1,
  }),

  // Heat: what escaping a hunt through doors costs (see heat.js).
  heat: Object.freeze({
    maxLevel: 3,
    // Pursuit: how long after you the following guard comes through the door.
    followSeconds: 1,
    // Lockdown: how long a room's doors and halls stay locked after an Alert starts there.
    lockSeconds: 6,
  }),

  // Heat-up detection: how the player's movement slows every awareness meter, and how fast
  // camera, searchlight, and snitch meters drain once you are out of view.
  awareness: Object.freeze({
    crouchFactor: 0.5,
    stillFactor: 0.5,
    drainPerSecond: 0.35,
  }),

  // Solitary: what the first capture costs, instead of ending the run.
  solitary: Object.freeze({
    penaltySeconds: 60,
    // How long you sit in the cell before a guard walks you back, and how long the fade lasts.
    cellSeconds: 4,
    fadeSeconds: 1.5,
    // How long the time penalty stays on screen by the timer.
    showSeconds: 8,
  }),

  // Takedowns: grab a guard from behind, then choose.
  takedown: Object.freeze({
    // How far in front of you he is held.
    holdGap: 0.6,
    // Hold him this long without choosing and he breaks free.
    holdSeconds: 6,
    interrogateSeconds: 2,
    // How long his words stay up in a speech bubble.
    speechSeconds: 7,
    // Speed while dragging a guard you are holding.
    dragSpeed: 1.2,
    // Thrown to the floor: stunned this long, heard this far, and pushed this far from you.
    slamStunSeconds: 2,
    slamNoiseRadius: 10,
    slamPushMetres: 1,
    // Let go after he has talked: this long before he comes to his senses.
    releaseStunSeconds: 2,
    // Dropping on a guard from above: how far below you he can be, and how far to the side.
    aboveMinDrop: 1,
    aboveMaxDrop: 8,
    aboveReach: 1,
    // Pulling a guard into your hiding spot.
    pullInReach: 1.2,
    // An interrogated guard can show his room's patrols on your map for this long.
    patrolRevealSeconds: 60,
  }),

  // Radio check-ins. The first guard calls in at firstSeconds, the next staggerSeconds later,
  // and so on. Each guard then calls in again every intervalSeconds.
  radio: Object.freeze({
    firstSeconds: 20,
    staggerSeconds: 8,
    intervalSeconds: 60,
    showSeconds: 2,
    // A guard who cannot answer because he is being held is tried again this soon.
    retrySeconds: 5,
  }),

  // How a knockout feels. All of it is drawing and sound: none of it changes the rules.
  feel: Object.freeze({
    hitStopSeconds: 0.08,
    flashSeconds: 0.12,
    fallSeconds: 0.28,
    shakeSeconds: 0.25,
    shakeMetres: 0.14,
    // A shove, or a thrown item hitting a head, is the same but lighter.
    lightHitStopSeconds: 0.04,
    lightShakeMetres: 0.06,
  }),

  // Jump, slide, dash, and climbing. Jump and slide work everywhere from the start of a run.
  // Dash needs the work boots from the Yard's equipment shed (the gym has it for practice).
  // The peak of a jump is jumpSpeed squared over twice gravity.
  moves: Object.freeze({
    // Adam's values from the gym sliders (playtest 4). Jump height 1.5 m, dash distance 4.5 m.
    jumpSpeed: 7.55,
    gravity: 19,
    fallGravity: 40,
    maxFallSpeed: 20,
    // Letting go of jump early drops the upward speed to this.
    jumpCutSpeed: 3,
    // Holding down in the air drops faster still.
    fastDropGravity: 70,
    fastDropMaxSpeed: 28,
    // For this long after walking off an edge you can still jump (coyote time).
    coyoteSeconds: 0.1,
    // A jump pressed this long before landing still happens on landing (jump buffering).
    jumpBufferSeconds: 0.1,
    // A dash is a fixed burst: dashSpeed for dashSeconds, 4.5 m. In the air it holds its height.
    dashSpeed: 12.5,
    dashSeconds: 0.36,
    dashCooldownSeconds: 0.2,
    // A slide is slideSpeed for slideSeconds, 3.15 m, with the body only slideHeight tall.
    slideSpeed: 7,
    slideSeconds: 0.45,
    slideHeight: 0.6,
    // After a slide ends, the next one has to wait this long. A run of slides is then slower
    // than running, as it should be for something so quiet.
    slideRecoverySeconds: 0.35,
    bodyHalfWidth: 0.3,
    // Ladders are quick. A chain-link fence is slow, and you are in plain view the whole way up.
    ladderClimbSpeed: 2.4,
    fenceClimbSpeed: 1.1,
    // How close you must be to a ladder, or to the side of a fence, to grab it.
    climbReach: 0.45,
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
