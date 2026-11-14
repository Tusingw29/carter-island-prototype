// The whole game state and the one function that moves it forward in time.
import { CONFIG } from './config.js';
import { PRISON } from './rooms.js';
import { raiseAlarm } from './alert.js';
import { createCamera, updateCamera } from './camera.js';
import { updateGrab } from './grab.js';
import { createGuard, isAwake } from './guard.js';
import { updateGuardAI, updateGuardAway, updateSleeper } from './guard-ai.js';
import { concealedIn, darkSpotAt, spotById, toggleHide } from './hiding.js';
import { updateHold } from './holds.js';
import { pickUp, pickupInReach } from './items.js';
import { keycardInReach, takeKeycard } from './keycard.js';
import { fullSpotIds, pressAction, stuffBody, updateDrag } from './knockout.js';
import { noiseRadius } from './noise.js';
import { createPlayer, updatePlayer } from './player.js';
import { enterRoom, hallBeingEntered, travel } from './portals.js';
import { canSleep, endRun, updateTimer } from './run.js';
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
    allGuards: rooms.flatMap((room) => (room.guards ?? []).map((def) => ({ ...createGuard(def), roomId: room.id }))),
    guards: [],
    cameras: rooms.flatMap((room) => (room.cameras ?? []).map((def) => createCamera(def, room.id))),
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
    // Tap-or-hold in progress for Up (creaky doors) and Interact (the keycard).
    holds: { up: null, interact: null },
    // Ids of items picked up, and the message on screen right now ({ text, until }).
    taken: new Set(),
    message: null,
    seenByCamera: false,
    silentAlarm: false,
    keycardGrab: null,
    // Set while a guard is holding the player: { guardId, presses, timeLeft }.
    grab: null,
    grabImmunity: 0,
    breakFreeUsed: false,
    // null while playing. Otherwise 'win', 'caught', 'headcount', or 'empty-handed'.
    over: null,
    result: null,
    upWasHeld: false,
    actionWasHeld: false,
    interactWasHeld: false,
    stats: { timesSpotted: 0, knockouts: 0, bodiesFound: 0 },
  };
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
  const target = upTarget(world);
  const portal = target?.kind === 'portal' ? target.portal : null;

  // Creaky doors: a tap opens fast and loud, a full hold opens slowly and quietly.
  if (portal?.creaky) {
    const result = updateHold(world, 'up', { key: portal.id, pressed, held: intent.up }, dt);
    if (result) travel(world, portal, result === 'fast');
    return;
  }
  updateHold(world, 'up', noTarget, dt);
  // Walking up to a vent is enough to find it, so it goes on the map.
  if (portal?.type === 'vent') world.knownPortals.add(portal.id);
  if (!pressed) return;
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
  const result = toggleHide(player, room.hideSpots ?? [], fullSpotIds(world));
  if (result) world.events.push({ type: result === 'hid' ? 'hide' : 'unhide' });
}

function handleInteract(world, intent, pressed, dt) {
  const card = keycardInReach(world);
  const key = card ? card.id : null;
  // The keycard: a tap grabs it fast, a full hold lifts it quietly.
  const result = updateHold(world, 'interact', { key, pressed, held: intent.interact }, dt);
  if (result) takeKeycard(world, result);
  if (!pressed || card) return;
  const item = pickupInReach(world);
  if (item) pickUp(world, item);
  else if (canSleep(world)) endRun(world, 'win');
}

// Getting into a hiding spot while a guard is watching does not work: he knows where you are.
function noteWatchedHiding(world, wasConcealed, cfg) {
  const spotId = concealedIn(world.player);
  if (!spotId || wasConcealed) return;
  for (const guard of world.guards.filter(isAwake)) {
    const chasing = guard.state === 'alert' && (guard.seesPlayer || guard.trackTimer > 0);
    const watching = guard.seesPlayer && guard.detection >= cfg.glimpseThreshold;
    if (!chasing && !watching) continue;
    if (guard.state !== 'alert') raiseAlarm(world, world.player.x, 'sight', cfg);
    guard.knownSpotId = spotId;
  }
}

function updateEveryoneElse(world, dt, cfg) {
  for (const camera of world.cameras) updateCamera(camera, world, dt, cfg.camera);
  for (const guard of world.guards) {
    if (isAwake(guard)) updateSenses(guard, world, dt, cfg.guard);
    else if (guard.state === 'asleep') updateSleeper(guard, world, dt, cfg.guard);
  }
  for (const guard of world.guards.filter(isAwake)) updateGuardAI(guard, world, dt, cfg.guard);
  for (const guard of world.allGuards.filter((g) => g.roomId !== world.room.id)) {
    if (isAwake(guard)) updateGuardAway(guard, world, dt, cfg.guard);
    // A stirring sleeper settles again once you have left his room.
    else guard.stirTimer = 0;
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

  const wasConcealed = concealedIn(player);
  if (actionPressed) pressAction(world);
  handleUp(world, intent, upPressed, dt);
  handleInteract(world, intent, interactPressed, dt);
  if (world.over) return;

  const hall = hallBeingEntered(world, intent);
  if (hall) travel(world, hall);
  const spots = world.room.hideSpots ?? [];
  const hideSpot = player.hiddenIn ? spotById(spots, player.hiddenIn) : null;
  // In the duct there is no room to stand: you crawl, which is slow but silent.
  const moving = world.room.crawl ? { ...intent, crouch: true, run: false } : intent;
  updatePlayer(player, moving, dt, world.room.width, cfg.player, hideSpot);
  updateDrag(world);
  player.inDark = darkSpotAt(player, spots);
  noteWatchedHiding(world, wasConcealed, cfg.guard);

  world.noiseRadius = noiseRadius(player.mode);
  world.noises = world.pendingNoises;
  world.pendingNoises = [];
  if (world.noiseRadius > 0) world.noises.push({ x: player.x, radius: world.noiseRadius });

  updateEveryoneElse(world, dt, cfg);
  world.time += dt;
  updateTimer(world, dt);
}
