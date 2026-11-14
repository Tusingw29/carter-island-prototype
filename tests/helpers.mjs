// Shared helpers for tests that run the game world.
import { emptyIntent } from '../site/js/game/intent.js';
import { enterRoom } from '../site/js/game/portals.js';
import { createWorld, stepWorld } from '../site/js/game/world.js';

export const STEP = 1 / 120;
export const intent = (changes = {}) => ({ ...emptyIntent(), ...changes });

// Steps the world for some seconds holding the same buttons.
export function run(world, changes, seconds) {
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) stepWorld(world, intent(changes), STEP);
}

// Steps until check(world) is true. Fails the test if it never happens.
export function runUntil(world, check, changes = {}, maxSeconds = 60) {
  for (let i = 0; i < maxSeconds / STEP; i += 1) {
    if (check(world)) return world.time;
    stepWorld(world, intent(changes), STEP);
  }
  throw new Error(`never happened within ${maxSeconds} seconds`);
}

// One fresh press of a button: down for a step, then released for a step.
export function tap(world, button) {
  stepWorld(world, intent({ [button]: true }), STEP);
  stepWorld(world, intent(), STEP);
}

// A plain room with whatever guards and hiding spots a test needs.
export function testWorld({ width = 40, playerX = 20, guards = [], hideSpots = [], ...extra } = {}) {
  const room = { id: 'test', name: 'Test', width, playerStart: playerX, hideSpots, guards, ...extra };
  return createWorld(room);
}

export const eventTypes = (world) => world.events.map((event) => event.type);

// The full prison, with the player dropped into a room at x, out of bed.
export function prisonWorld(roomId, x) {
  const world = createWorld();
  world.player.hiddenIn = null;
  enterRoom(world, roomId, x);
  world.events.length = 0;
  return world;
}

export const guardById = (world, id) => world.allGuards.find((guard) => guard.id === id);
