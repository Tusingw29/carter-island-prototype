// The whole game state and the one function that moves it forward in time.
import { CONFIG } from './config.js';
import { PRISON } from './rooms.js';
import { raiseAlarm } from './alert.js';
import { createCamera, updateCamera } from './camera.js';
import { updateGrab } from './grab.js';
import { createGuard, isAwake, obstaclesFor } from './guard.js';
import { updateGuardAI, updateGuardAway, updateSleeper } from './guard-ai.js';
import { concealedIn, darkSpotAt, spotById, toggleHide } from './hiding.js';
import { updateHold } from './holds.js';
import { updateBedCheck } from './bedcheck.js';
import { noteFinds, pressInteract } from './interact.js';
import { keycardInReach, takeKeycard } from './keycard.js';
import {
  fullSpotIds, pressAction, stuffBody, updateDrag, updateKnockedOut,
} from './knockout.js';
import { notePlaces } from './map.js';
import { say } from './messages.js';
import { updateCourse, updateMover } from './moves.js';
import { noiseRadius } from './noise.js';
import { createPlayer, updatePlayer } from './player.js';
import { enterRoom, hallBeingEntered, travel } from './portals.js';
import { setUpRadio, updateRadio } from './radio.js';
import { updateTimer } from './run.js';
import * as take from './takedown.js';
import { updateThrowing } from './throwing.js';
import { createSnitch, openCell, updateSnitch } from './snitch.js';
import { updateSenses } from './senses.js';
import { upTarget } from './targets.js';
import { useProp, useVent } from './vents.js';

// source is a whole layout ({ startRoom, rooms }) or a single room, which is handy in tests.
export function createWorld(source = PRISON, cfg = CONFIG) {
  const layout = source.rooms ? source : { startRoom: source.id, rooms: { [source.id]: source } };
  const rooms = Object.values(layout.rooms);
  const start = layout.rooms[layout.startRoom];
  const world = {
    layout,
    room: start,
    time: 0,
    timeLeft: cfg.headcountSeconds,
    player: createPlayer(start.playerStart),
    // Every guard in the prison, and the ones in the player's current room.
    allGuards: rooms.flatMap((room) => (room.guards ?? []).map((def) => (
      { ...createGuard(def), roomId: room.id, obstacles: obstaclesFor(room, def.y ?? 0) }
    ))),
    guards: [],
    cameras: rooms.flatMap((room) => (room.cameras ?? []).map((def) => createCamera(def, room.id))),
    snitches: rooms.flatMap((room) => (room.snitches ?? []).map((def) => createSnitch(def, room.id))),
    // Noises made this step, as { x, radius }. Guards in range hear them.
    noises: [],
    pendingNoises: [],
    noiseRadius: 0,
    // Things that just happened, for sound and on-screen feedback. The reader empties it.
    events: [],
    // Hiding spots a searching guard has already taken, so two guards do not check the same one.
    searchClaims: new Set(),
    // Rooms entered and ways between rooms found so far, for the map screen.
    visited: new Set(),
    knownPortals: new Set(),
    // Parts of a room that are their own box on the map, such as the Yard's roof, once reached.
    visitedParts: new Set(),
    // Tap-or-hold in progress for Up (creaky doors) and Interact (the keycard).
    holds: { up: null, interact: null },
    // Ids of items picked up, and the message on screen right now ({ text, until }).
    taken: new Set(),
    message: null,
    // Props the player has walked up to, hints the trader has given, and whether he has been paid.
    found: new Set(),
    notes: [],
    traded: false,
    // The bed check: null until it starts, then { result, guardId }.
    bedCheck: null,
    dummyInBed: false,
    seenByCamera: false,
    // The room where a camera first saw the player, for explaining the silent alarm.
    cameraSawIn: null,
    silentAlarm: false,
    // Why it fired: 'camera', 'knockout', or both.
    silentAlarmReasons: [],
    // The PA announcement on screen right now ({ text, until }).
    pa: null,
    keycardGrab: null,
    // Set while a guard is holding the player: { guardId, presses, timeLeft }.
    grab: null,
    // The guard a shove was just refused on, for the "not ready" shake: { guardId, until }.
    risky: null,
    // The shove can be used again from this moment on.
    shoveReadyAt: 0,
    // True while the throw button is held (the arc is showing), and the things in the air.
    aiming: false,
    thrown: [],
    // What set off the last alarm and when, and the same for the last grab. For the score screen.
    lastAlarm: null,
    lastGrab: null,
    grabImmunity: 0,
    breakFreeUsed: false,
    // null while playing. Otherwise 'win', 'caught', 'headcount', or 'empty-handed'.
    over: null,
    result: null,
    upWasHeld: false,
    actionWasHeld: false,
    interactWasHeld: false,
    jumpWasHeld: false,
    dashWasHeld: false,
    stats: {
      timesSpotted: 0, knockouts: 0, bodiesFound: 0,
      // Knockouts by how they were done, guards thrown down, guards who talked, and radio
      // check-ins answered for a guard whose code you had.
      takedowns: { choke: 0, above: 0, pullIn: 0 },
      slams: 0,
      interrogations: 0,
      checkInsFaked: 0,
    },
    // The guard being held in a takedown: { guardId, time, asking, talked }, or null.
    hold: null,
    // What interrogated guards have told you, as { from, type, text }, for the map screen.
    intel: [],
    // A room whose patrols are showing on the map: { roomId, until }.
    patrolReveal: null,
    // One-off noises just made, as { x, y, radius, at }, so they can be drawn as rings.
    pings: [],
    throwWasHeld: false,
    throwLock: false,
  };
  setUpRadio(world, cfg.radio);
  enterRoom(world, start.id, start.playerStart);
  world.events.length = 0;
  if (start.startHiddenIn) world.player.hiddenIn = start.startHiddenIn;
  return world;
}

function handleUp(world, intent, pressed, dt) {
  const { player, room } = world;
  const noTarget = { key: null, pressed, held: intent.up };
  if (player.dragging) {
    updateHold(world, 'up', noTarget, dt);
    if (pressed) stuffBody(world);
    return;
  }
  // Doors, stairs, and hiding spots are for someone with their feet on the ground.
  if (!player.onGround) {
    updateHold(world, 'up', noTarget, dt);
    return;
  }
  const target = upTarget(world);
  const portal = target?.kind === 'portal' ? target.portal : null;

  // Creaky doors: a tap opens fast and loud, a full hold opens slowly and quietly.
  if (portal?.creaky) {
    const result = updateHold(world, 'up', { key: portal.id, pressed, held: intent.up }, dt);
    if (result) travel(world, portal, result === 'fast');
    return;
  }
  updateHold(world, 'up', noTarget, dt);
  // Walking up to a vent, or any other hidden way, is enough to find it, so it goes on the map.
  if (portal?.type === 'vent' || portal?.hidden) world.knownPortals.add(portal.id);
  if (!pressed) return;
  if (portal?.exitOnly && portal.type !== 'vent') {
    say(world, 'Latched from the inside. It only opens from the other side.');
    world.events.push({ type: 'locked' });
    return;
  }
  if (portal?.type === 'vent') {
    useVent(world, portal);
    return;
  }
  if (portal) {
    travel(world, portal);
    return;
  }
  if (target?.kind === 'prop') {
    useProp(world, target.prop);
    return;
  }
  if (target?.kind === 'cell') {
    openCell(world, target.snitch);
    return;
  }
  const result = toggleHide(player, room.hideSpots ?? [], fullSpotIds(world));
  if (result) world.events.push({ type: result === 'hid' ? 'hide' : 'unhide' });
}

function handleInteract(world, intent, pressed, dt) {
  const card = keycardInReach(world);
  const key = card ? card.id : null;
  // The keycard: a tap grabs it fast, a full hold lifts it quietly.
  const result = updateHold(world, 'interact', { key, pressed, held: intent.interact }, dt);
  if (result) takeKeycard(world, result);
  else if (pressed && !card) pressInteract(world);
  noteFinds(world);
}

// Getting into a hiding spot while a guard is watching does not work: he knows where you are.
function noteWatchedHiding(world, wasConcealed, cfg) {
  const spotId = concealedIn(world.player);
  if (!spotId || wasConcealed) return;
  for (const guard of world.guards.filter(isAwake)) {
    const chasing = guard.state === 'alert' && (guard.seesPlayer || guard.trackTimer > 0);
    const watching = guard.seesPlayer && guard.detection >= cfg.glimpseThreshold;
    if (!chasing && !watching) continue;
    const cause = { kind: 'watchedHiding', guard };
    if (guard.state !== 'alert') raiseAlarm(world, world.player.x, 'sight', cfg, world.room.id, cause);
    guard.knownSpotId = spotId;
  }
}

function updateEveryoneElse(world, dt, cfg) {
  for (const camera of world.cameras) updateCamera(camera, world, dt, cfg.camera);
  for (const snitch of world.snitches) updateSnitch(snitch, world, dt, cfg.snitch);
  const active = isAwake;
  // Copies, because a guard on a radio check can walk into or out of the room mid-step.
  const here = [...world.guards];
  const away = world.allGuards.filter((guard) => guard.roomId !== world.room.id);
  for (const guard of here) {
    if (active(guard)) updateSenses(guard, world, dt, cfg.guard);
    else if (guard.state === 'asleep') updateSleeper(guard, world, dt, cfg.guard);
  }
  for (const guard of here.filter(active)) updateGuardAI(guard, world, dt, cfg.guard);
  for (const guard of away) {
    if (isAwake(guard)) updateGuardAway(guard, world, dt, cfg.guard);
    // A stirring sleeper settles again once you have left his room.
    else guard.stirTimer = 0;
  }
  updateKnockedOut(world, dt, cfg);
  updateRadio(world, cfg.radio);
  // Gym guards stay on their own stretch of floor, even when chasing.
  for (const guard of world.allGuards) {
    if (guard.bounds) guard.x = Math.max(guard.bounds[0], Math.min(guard.bounds[1], guard.x));
  }
}

export function stepWorld(world, intent, dt, cfg = CONFIG) {
  if (world.over) return;
  const { player } = world;

  // Buttons act once per press, not every frame they are held.
  const upPressed = intent.up && !world.upWasHeld;
  const actionPressed = intent.action && !world.actionWasHeld;
  const interactPressed = intent.interact && !world.interactWasHeld;
  world.upWasHeld = intent.up;
  world.actionWasHeld = intent.action;
  world.interactWasHeld = intent.interact;
  world.grabImmunity = Math.max(0, world.grabImmunity - dt);

  // While a guard holds the player, everything waits on the mashing. The timer does not.
  if (world.grab) {
    player.mode = 'grabbed';
    player.speed = 0;
    world.noiseRadius = 0;
    updateGrab(world, actionPressed, dt, cfg);
    world.time += dt;
    updateTimer(world, dt);
    return;
  }

  const pressedMoves = { jump: intent.jump && !world.jumpWasHeld, dash: intent.dash && !world.dashWasHeld };
  world.jumpWasHeld = intent.jump;
  world.dashWasHeld = intent.dash;

  const throwPressed = intent.throw && !world.throwWasHeld;
  world.throwWasHeld = intent.throw;
  const wasConcealed = concealedIn(player);
  // With a guard in your hands the buttons mean the takedown choices and nothing else.
  const holding = Boolean(world.hold);
  if (holding) {
    const pressed = { action: actionPressed, interact: interactPressed, throw: throwPressed };
    take.updateTakedown(world, intent, pressed, dt, cfg);
  } else {
    if (actionPressed) pressAction(world, take);
    // The press that grabbed him must not also count as the first choice.
    if (!world.hold) {
      handleUp(world, intent, upPressed, dt);
      handleInteract(world, intent, interactPressed, dt);
    }
  }
  if (world.over) return;
  const hall = holding || world.hold ? null : hallBeingEntered(world, intent);
  if (hall) travel(world, hall);
  const spots = world.room.hideSpots ?? [];
  const hideSpot = player.hiddenIn ? spotById(spots, player.hiddenIn) : null;
  let moving = intent;
  // Holding a guard you can only walk him along, slowly. Interrogating, you cannot move at all.
  if (world.hold) {
    const moveX = take.interrogating(world) ? 0 : intent.moveX;
    moving = { ...intent, moveX, up: false, crouch: false, run: false, jump: false, dash: false };
  }
  // In the duct there is no room to stand: you crawl, which is slow but silent.
  if (world.room.crawl) moving = { ...intent, crouch: true, run: false };
  if (!world.room.crawl && !player.hiddenIn) {
    // Up climbs a ladder or a fence only when it has nothing else to do here.
    const mayClimb = !upTarget(world);
    updateMover(world, moving, pressedMoves, dt, cfg, mayClimb);
    updateCourse(world);
  } else {
    updatePlayer(player, moving, dt, world.room.width, cfg.player, hideSpot);
  }
  updateDrag(world);
  take.carryHeld(world, cfg);
  // The press that threw a guard down must not also start aiming whatever you are carrying.
  if (holding || world.hold) world.throwLock = true;
  else if (!intent.throw) world.throwLock = false;
  updateThrowing(world, intent.throw && !world.throwLock, dt, cfg.throwing);
  player.inDark = darkSpotAt(player, spots);
  noteWatchedHiding(world, wasConcealed, cfg.guard);

  world.noiseRadius = noiseRadius(player.mode);
  world.noises = world.pendingNoises;
  world.pendingNoises = [];
  // One-off noises are remembered for a moment so they can be drawn.
  world.pings = world.pings.filter((ping) => world.time - ping.at < 0.5);
  for (const { x, y = 0, radius } of world.noises) world.pings.push({ x, y, radius, at: world.time });
  // Footsteps are a steady noise: they fill a guard's hearing meter over time.
  if (world.noiseRadius > 0) {
    world.noises.push({ x: player.x, y: player.y, radius: world.noiseRadius, steady: true });
  }
  notePlaces(world);

  updateEveryoneElse(world, dt, cfg);
  world.time += dt;
  updateTimer(world, dt);
  if (!world.over) updateBedCheck(world, cfg);
}
