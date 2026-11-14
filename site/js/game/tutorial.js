// Short hints shown the first time you are in a position to do each thing.
import { isAwake } from './guard.js';
import { knockoutTarget } from './knockout.js';
import { inBed } from './run.js';
import { upTarget } from './targets.js';

function nearGuard(world, metres) {
  return world.guards.some((guard) => isAwake(guard) && Math.abs(guard.x - world.player.x) <= metres);
}

function inDarkPatch(world) {
  const spots = world.room.hideSpots ?? [];
  return spots.some((spot) => spot.type === 'dark' && Math.abs(spot.x - world.player.x) <= spot.halfWidth);
}

function target(world, kind, test = () => true) {
  const found = upTarget(world);
  return found?.kind === kind && test(found);
}

// In order of importance: if two apply at once, the earlier one is shown first.
export const TUTORIAL = Object.freeze([
  {
    id: 'start',
    when: (world) => inBed(world) && !world.player.hasKeycard,
    text: 'Lights out. Steal the keycard from the Guard Office and be back in this bed before the timer '
      + 'runs out. Press W (or Up) to get out of bed.',
  },
  {
    id: 'crouch',
    when: (world) => !world.player.hiddenIn && !world.room.crawl && nearGuard(world, 11),
    text: 'Hold S (or Down) to crouch. Crouching is silent but slow. Walking is quiet. '
      + 'Running with Shift (or Right Trigger) is loud.',
  },
  {
    id: 'hide',
    when: (world) => target(world, 'spot', (found) => found.spot.type !== 'bed'),
    text: 'Press W (or Up) here to hide. A guard cannot see you while you are hidden, unless he watched '
      + 'you get in. Press it again to come out.',
  },
  {
    id: 'dark',
    when: (world) => !world.player.hiddenIn && inDarkPatch(world),
    text: 'This patch is pitch dark. Stand still in it and nobody can see you. Move and they can.',
  },
  {
    id: 'knockout',
    when: (world) => Boolean(knockoutTarget(world)),
    text: 'You are behind him and he has not seen you. Press Space (or X) to knock him out. '
      + 'He wakes up after a while, and the other guards notice when he misses his radio check-in.',
  },
  {
    id: 'door',
    when: (world) => target(world, 'portal', (found) => Boolean(found.portal.creaky)),
    text: 'This door creaks. Tap W (or Up) to open it fast and loud, or hold it for 2 seconds to open it quietly.',
  },
  {
    id: 'vent',
    when: (world) => target(world, 'portal', (found) => found.portal.type === 'vent'),
    text: 'A vent. Covers with amber screws need a tool. Once you are inside, crawling is slow but silent, '
      + 'and you can look down through the grates.',
  },
]);

// The next hint to show, given the ids already seen. Returns null if there is nothing new.
export function nextTutorial(world, seen) {
  if (world.over || world.grab) return null;
  return TUTORIAL.find((hint) => !seen.has(hint.id) && hint.when(world)) ?? null;
}
