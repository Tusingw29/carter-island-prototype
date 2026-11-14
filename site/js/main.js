// Browser entry point: reads input, steps the game at a fixed rate, draws the result.
import { enterRoom } from './game/portals.js';
import { createWorld, stepWorld } from './game/world.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { createEndScreen } from './render/end-screen.js';
import { createGameView } from './render/game-view.js';
import { createHud } from './render/hud.js';
import { createMapScreen } from './render/map-screen.js';
import { createOverlay } from './render/overlay.js';
import { createStage } from './render/stage.js';

// Game logic always advances in steps of this size, so it behaves the same on every machine.
const STEP = 1 / 120;
const MAX_FRAME = 0.1;

const build = document.querySelector('meta[name="build"]')?.content ?? 'dev';
const params = new URLSearchParams(window.location.search);
const input = createInput();
const sound = createSound();
const stage = createStage(document.getElementById('stage'));
const overlay = createOverlay();
const hud = createHud(build);
const mapScreen = createMapScreen();
const endScreen = createEndScreen(startRun);
const pauseScreen = document.getElementById('pause-screen');

let world = null;
let view = null;
let debug = params.has('debug');
let paused = false;
let mapOpen = false;
let was = {};
let last = performance.now();
let owed = 0;

function buildView() {
  if (view) {
    stage.scene.remove(view.root);
    view.dispose();
  }
  view = createGameView(world);
  stage.scene.add(view.root);
}

function startRun() {
  world = createWorld();
  // Debug links: ?debug turns debug mode on. ?room=mess-hall&px=9 starts you in a room at a spot.
  // ?timer=30 starts with 30 seconds left.
  if (params.has('room')) {
    world.player.hiddenIn = null;
    enterRoom(world, params.get('room'), Number(params.get('px') ?? 1));
  }
  if (params.has('timer')) world.timeLeft = Number(params.get('timer'));
  paused = false;
  mapOpen = params.has('map');
  buildView();
  draw(Infinity);
}

function draw(dt) {
  // Each room is its own little scene. Entering a new room swaps it in.
  const changedRoom = view.roomId !== world.room.id;
  if (changedRoom) buildView();
  view.update(debug);
  stage.follow(world.player.x, world.room.width, changedRoom ? Infinity : dt);
  overlay.update(world, stage.camera, debug);
  hud.update(world, debug);
  mapScreen.update(world, mapOpen && !world.over);
  endScreen.update(world);
  pauseScreen.hidden = !paused || Boolean(world.over);
  stage.render();
}

// True only on the frame a button goes down.
function pressed(intent, name) {
  const fresh = intent[name] && !was[name];
  was[name] = intent[name];
  return fresh;
}

function frame(now) {
  const dt = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  const intent = input.read();
  if (pressed(intent, 'debug')) debug = !debug;
  if (pressed(intent, 'map')) mapOpen = !mapOpen;
  if (pressed(intent, 'pause') && !world.over) paused = !paused;
  const confirm = pressed(intent, 'interact');
  if (world.over && confirm) startRun();
  // Debug timer controls.
  for (const [key, change] of [['timerDown', -30], ['timerUp', 30]]) {
    if (pressed(intent, key) && debug) world.timeLeft = Math.max(1, world.timeLeft + change);
  }

  // The timer only ever stops in the pause menu.
  if (!paused) {
    owed += dt;
    while (owed >= STEP) {
      stepWorld(world, intent, STEP);
      owed -= STEP;
    }
  }
  sound.playEvents(world.events.filter((event) => !event.roomId || event.roomId === world.room.id));
  world.events.length = 0;
  draw(dt);
  requestAnimationFrame(frame);
}

document.getElementById('resume').addEventListener('click', () => { paused = false; });
document.getElementById('restart').addEventListener('click', startRun);
startRun();
requestAnimationFrame(frame);
