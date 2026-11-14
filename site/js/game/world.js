// The whole game state and the one function that moves it forward in time.
import { CONFIG } from './config.js';
import { CELL_BLOCK } from './rooms.js';
import { raiseAlarm } from './alert.js';
import { updateGrab } from './grab.js';
import { createGuard, isConscious } from './guard.js';
import { updateGuardAI } from './guard-ai.js';
import { concealedIn, darkSpotAt, toggleHide } from './hiding.js';
import { fullSpotIds, pressAction, stuffBody, updateDrag } from './knockout.js';
import { noiseRadius } from './noise.js';
import { createPlayer, updatePlayer } from './player.js';
import { updateSenses } from './senses.js';

export function createWorld(room = CELL_BLOCK) {
  return {
    room,
    time: 0,
    player: createPlayer(room.playerStart),
    guards: room.guards.map(createGuard),
    // Noises made this step, as { x, radius }. Guards in range hear them.
    noises: [],
    noiseRadius: 0,
    // Things that just happened, for sound and on-screen feedback. The reader empties it.
    events: [],
    // Hiding spots a searching guard has already taken, so two guards do not check the same one.
    searchClaims: new Set(),
    // Set while a guard is holding the player: { guardId, presses, timeLeft }.
    grab: null,
    grabImmunity: 0,
    breakFreeUsed: false,
    // null while playing, 'caught' when the run has ended.
    over: null,
    upWasHeld: false,
    actionWasHeld: false,
    stats: { timesSpotted: 0, knockouts: 0, bodiesFound: 0 },
  };
}

function handleButtons(world, upPressed, actionPressed) {
  const { player } = world;
  if (actionPressed) pressAction(world);
  if (!upPressed) return;
  if (player.dragging) {
    stuffBody(world);
    return;
  }
  const result = toggleHide(player, world.room.hideSpots, fullSpotIds(world));
  if (result) world.events.push({ type: result === 'hid' ? 'hide' : 'unhide' });
}

// Getting into a hiding spot while a guard is watching does not work: he knows where you are.
function noteWatchedHiding(world, wasConcealed, cfg) {
  const spotId = concealedIn(world.player);
  if (!spotId || wasConcealed) return;
  for (const guard of world.guards.filter(isConscious)) {
    const chasing = guard.state === 'alert' && (guard.seesPlayer || guard.trackTimer > 0);
    const watching = guard.seesPlayer && guard.detection >= cfg.glimpseThreshold;
    if (!chasing && !watching) continue;
    if (guard.state !== 'alert') raiseAlarm(world, world.player.x, 'sight', cfg);
    guard.knownSpotId = spotId;
  }
}

export function stepWorld(world, intent, dt, cfg = CONFIG) {
  if (world.over) return;
  const { player, room } = world;

  // Buttons act once per press, not every frame they are held.
  const upPressed = intent.up && !world.upWasHeld;
  const actionPressed = intent.action && !world.actionWasHeld;
  world.upWasHeld = intent.up;
  world.actionWasHeld = intent.action;
  world.grabImmunity = Math.max(0, world.grabImmunity - dt);

  // While a guard holds the player, everything else waits on the mashing.
  if (world.grab) {
    player.mode = 'grabbed';
    player.speed = 0;
    world.noiseRadius = 0;
    updateGrab(world, actionPressed, dt, cfg);
    world.time += dt;
    return;
  }

  const wasConcealed = concealedIn(player);
  handleButtons(world, upPressed, actionPressed);
  updatePlayer(player, intent, dt, room.width);
  updateDrag(world);
  player.inDark = darkSpotAt(player, room.hideSpots);
  noteWatchedHiding(world, wasConcealed, cfg.guard);

  world.noiseRadius = noiseRadius(player.mode);
  world.noises = world.noiseRadius > 0 ? [{ x: player.x, radius: world.noiseRadius }] : [];

  for (const guard of world.guards.filter(isConscious)) updateSenses(guard, world, dt, cfg.guard);
  for (const guard of world.guards.filter(isConscious)) updateGuardAI(guard, world, dt, cfg.guard);
  world.time += dt;
}
