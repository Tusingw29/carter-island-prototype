// Browser entry point: reads input, steps the game at a fixed rate, draws the result.
import {
  createFraming, farness, framingLabel, parseCameraMode, toggleZoom, updateFraming,
} from './game/framing.js';
import { enterRoom } from './game/portals.js';
import { jumpTimer } from './game/run.js';
import { createWorld, stepWorld } from './game/world.js';
import { createInput } from './input.js';
import { createMovementSounds, createSound } from './sound.js';
import { createEndScreen } from './render/end-screen.js';
import { createGameView } from './render/game-view.js';
import { createHud } from './render/hud.js';
import { createMapScreen } from './render/map-screen.js';
import { createOverlay } from './render/overlay.js';
import { createScreens } from './render/screens.js';
import { setHidden, setText } from './render/dom.js';
import { createStage } from './render/stage.js';
import { createTutorialBox } from './render/tutorial-box.js';

// Game logic always advances in steps of this size, so it behaves the same on every machine.
const STEP = 1 / 120;
const MAX_FRAME = 0.1;

const build = document.querySelector('meta[name="build"]')?.content ?? 'dev';
const params = new URLSearchParams(window.location.search);
// ?cam=close, wide, room, or smart picks the camera. ?cues=off turns off the PA announcements,
// wall clocks, and last-minute ticking, leaving only the plain timer.
const framing = createFraming(parseCameraMode(params.get('cam')));
const cues = params.get('cues') !== 'off';
const QUIET_WITH_CUES = new Set(['timerWarning', 'timerTick']);
const QUIET_WITHOUT_CUES = new Set(['pa', 'clockTick']);
const cameraNote = document.getElementById('camera-note');
const cameraLine = document.getElementById('camera-line');
const NOTE_MS = 2500;
let noteUntil = 0;
const input = createInput();
const sound = createSound();
const movementSounds = createMovementSounds(sound);
// ?low starts at the lowest picture quality, for very slow machines.
const stage = createStage(document.getElementById('stage'), params.has('low'));
const overlay = createOverlay();
const hud = createHud(build, cues);
const mapScreen = createMapScreen();
const tutorial = createTutorialBox();
const endScreen = createEndScreen(startRun);
const screens = createScreens({
  onStart: startRun,
  onResume: () => screens.show(null),
  onRestart: startRun,
  onQuit: showTitle,
  onResetHints: () => tutorial.reset(),
  getResult: () => world.result,
});

let world = null;
let view = null;
let debug = params.has('debug');
let mapOpen = false;
const was = {};
let last = performance.now();
let owed = 0;

function buildView() {
  if (view) {
    stage.scene.remove(view.root);
    view.dispose();
  }
  view = createGameView(world, { clock: cues });
  stage.scene.add(view.root);
}

function newWorld() {
  world = createWorld();
  // Debug links: ?debug turns debug mode on. ?room=mess-hall&px=9 starts you in a room at a spot.
  // ?timer=30 starts with 30 seconds left.
  if (params.has('room')) {
    world.player.hiddenIn = null;
    enterRoom(world, params.get('room'), Number(params.get('px') ?? 1));
  }
  if (params.has('timer')) world.timeLeft = Number(params.get('timer'));
  // ?alarm acts as if a camera saw you earlier, so the next keycard grab sets off the silent alarm.
  if (params.has('alarm')) world.seenByCamera = true;
  mapOpen = params.has('map');
  buildView();
}

function startRun() {
  newWorld();
  tutorial.hide();
  screens.show(null);
  sound.unlock();
  draw(Infinity);
}

// The title screen sits over a fresh, frozen world.
function showTitle() {
  newWorld();
  screens.show('title');
  draw(Infinity);
}

const playing = () => screens.open === null && !world.over;

function draw(dt) {
  // Each room is its own little scene. Entering a new room swaps it in.
  if (view.roomId !== world.room.id) buildView();
  updateFraming(framing, world, stage.aspect(), dt);
  stage.frame(framing);
  view.update(debug, farness(framing));
  setText(cameraLine, `Camera: ${framingLabel(framing)}. Z or Left Bumper zooms in and out.`);
  setHidden(cameraNote, performance.now() > noteUntil);
  overlay.update(world, stage.camera, debug);
  hud.update(world, debug, stage.speedReport());
  mapScreen.update(world, mapOpen && playing());
  endScreen.update(world, screens.open === null);
  document.body.classList.toggle('in-menu', screens.open !== null);
  stage.render();
}

// True only on the frame a button goes down.
function pressed(intent, name) {
  const fresh = intent[name] && !was[name];
  was[name] = intent[name];
  return fresh;
}

// Menus work from the keyboard and controller as well as the mouse.
function handleMenus(intent) {
  const confirm = pressed(intent, 'interact');
  const cancel = pressed(intent, 'pause');
  const controls = pressed(intent, 'controls');
  if (screens.isOverlay) {
    if (cancel || controls) screens.back();
  } else if (screens.open === 'title') {
    if (confirm) startRun();
    else if (controls) screens.openOver('controls');
  } else if (screens.open === 'pause') {
    if (cancel || confirm) screens.show(null);
    else if (controls) screens.openOver('controls');
  } else if (world.over) {
    if (confirm) startRun();
  } else if (cancel) {
    screens.show('pause');
  } else if (controls) {
    screens.show('pause');
    screens.openOver('controls');
  }
}

function frame(now) {
  const frameMs = now - last;
  const dt = Math.min(MAX_FRAME, frameMs / 1000);
  last = now;
  stage.watchSpeed(frameMs);
  const intent = input.read();
  if (pressed(intent, 'debug')) debug = !debug;
  if (pressed(intent, 'map')) mapOpen = !mapOpen;
  if (pressed(intent, 'zoom')) {
    toggleZoom(framing);
    setText(cameraNote, `Camera: ${framingLabel(framing)}`);
    noteUntil = now + NOTE_MS;
  }
  const wasPlaying = playing();
  handleMenus(intent);
  // Debug timer controls.
  for (const [key, change] of [['timerDown', -30], ['timerUp', 30]]) {
    if (pressed(intent, key) && debug) jumpTimer(world, change);
  }

  // The timer only ever stops in a menu. A button that closed a menu does not also act in the game.
  if (wasPlaying && playing()) {
    owed += dt;
    while (owed >= STEP) {
      stepWorld(world, intent, STEP);
      owed -= STEP;
    }
    movementSounds.update(world, dt);
    tutorial.update(world, dt);
  }
  // With the cues on, the PA and the speeding tick replace the plain one-minute warning.
  const quiet = cues ? QUIET_WITH_CUES : QUIET_WITHOUT_CUES;
  sound.playEvents(world.events.filter((event) => (
    !quiet.has(event.type) && (!event.roomId || event.roomId === world.room.id)
  )));
  world.events.length = 0;
  draw(dt);
  requestAnimationFrame(frame);
}

// Debug links skip the title screen, as does ?play.
if (['play', 'room', 'timer', 'alarm'].some((name) => params.has(name))) startRun();
else showTitle();
// ?show=controls (or pause, or playtest) opens that screen straight away, for checking layouts.
if (params.has('show')) screens.openOver(params.get('show'));
requestAnimationFrame(frame);
