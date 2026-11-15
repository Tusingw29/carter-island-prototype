// Instrument existing bots without changing their files or the game modules.
import { emptyIntent } from '../../site/js/game/intent.js';
import { createWorld as create, stepWorld as advance } from '../../site/js/game/world.js';
const live = new WeakSet();
export function createWorld(...args) {
  const world = create(...args);
  for (let i = 0; i < (globalThis.reviewDelay ?? 0) * 120; i += 1) {
    advance(world, emptyIntent(), 1 / 120);
  }
  live.add(world);
  return world;
}
export function stepWorld(world, input, dt, ...rest) {
  if (live.has(world)) globalThis.reviewRecord?.(world, input, dt);
  return advance(world, input, dt, ...rest);
}
