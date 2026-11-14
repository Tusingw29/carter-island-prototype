// Browser entry point: reads input, steps the game at a fixed rate, draws the result.
import { createWorld, stepWorld } from './game/world.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { createStage } from './render/stage.js';
import { createGameView } from './render/game-view.js';
import { createOverlay } from './render/overlay.js';

// Game logic always advances in steps of this size, so it behaves the same on every machine.
const STEP = 1 / 120;
const MAX_FRAME = 0.1;

const build = document.querySelector('meta[name="build"]')?.content ?? 'dev';
const params = new URLSearchParams(window.location.search);
const input = createInput();
const sound = createSound();
const stage = createStage(document.getElementById('stage'));
const overlay = createOverlay(build);

let world = null;
let view = null;
let debug = params.has('debug');
let debugWasHeld = false;
let last = performance.now();
let owed = 0;

function startRun() {
  if (view) {
    stage.scene.remove(view.root);
    view.dispose();
  }
  world = createWorld();
  // Debug links: ?debug turns debug mode on, ?px=9&gx=4 sets player and first guard positions.
  if (params.has('px')) world.player.x = Number(params.get('px'));
  if (params.has('gx')) world.guards[0].x = Number(params.get('gx'));
  view = createGameView(world);
  stage.scene.add(view.root);
  draw(Infinity);
}

function draw(dt) {
  view.update(debug);
  stage.follow(world.player.x, world.room.width, dt);
  overlay.update(world, stage.camera, debug);
  stage.render();
}

function frame(now) {
  const dt = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  const intent = input.read();
  if (intent.debug && !debugWasHeld) debug = !debug;
  debugWasHeld = intent.debug;
  if (world.over && intent.interact) startRun();

  owed += dt;
  while (owed >= STEP) {
    stepWorld(world, intent, STEP);
    owed -= STEP;
  }
  sound.playEvents(world.events);
  world.events.length = 0;
  draw(dt);
  requestAnimationFrame(frame);
}

document.getElementById('restart').addEventListener('click', startRun);
startRun();
requestAnimationFrame(frame);
