// Browser entry point: reads input, steps the game at a fixed rate, draws the result.
import { createWorld, stepWorld } from './game/world.js';
import { createInput } from './input.js';
import { createStage } from './render/stage.js';
import { createRoomView } from './render/room-view.js';
import { createPlayerView } from './render/player-view.js';
import { createGuardView } from './render/guard-view.js';
import { createDebugView } from './render/debug-view.js';
import { createOverlay } from './render/overlay.js';

// Game logic always advances in steps of this size, so it behaves the same on every machine.
const STEP = 1 / 120;
const MAX_FRAME = 0.1;

const build = document.querySelector('meta[name="build"]')?.content ?? 'dev';
const world = createWorld();
const input = createInput();
const stage = createStage(document.getElementById('stage'));

const roomView = createRoomView(world.room);
const playerView = createPlayerView();
const guardViews = world.guards.map(() => createGuardView(stage.scene));
const debugView = createDebugView(world);
const overlay = createOverlay(build);
stage.scene.add(roomView.group, playerView.group, debugView.group);

// Debug links: ?debug turns debug mode on, ?px=9&gx=4 sets player and guard start positions.
const params = new URLSearchParams(window.location.search);
if (params.has('px')) world.player.x = Number(params.get('px'));
if (params.has('gx')) world.guards[0].x = Number(params.get('gx'));
let debug = params.has('debug');
let debugWasHeld = false;
let last = performance.now();
let owed = 0;

function draw(dt) {
  roomView.update(world);
  playerView.update(world.player);
  world.guards.forEach((guard, i) => guardViews[i].update(guard));
  debugView.update(world, debug);
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

  owed += dt;
  while (owed >= STEP) {
    stepWorld(world, intent, STEP);
    owed -= STEP;
  }
  draw(dt);
  requestAnimationFrame(frame);
}

draw(Infinity);
requestAnimationFrame(frame);
