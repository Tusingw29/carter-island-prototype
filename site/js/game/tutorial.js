// Short hints shown the first time you are in a position to do each thing.
import { isAwake } from './guard.js';
import { knockoutTarget } from './knockout.js';
import { inBed } from './run.js';
import { shoveReady, shoveTarget } from './shove.js';
import { lastSeenMarkers } from './lastseen.js';
import { climbableAt } from './moves.js';
import { dropTarget } from './takedown.js';
import { throwableInReach } from './throwing.js';
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
    text: 'You are behind him and he has not seen you. Press Space (or X) to grab him. '
      + 'You then get a short menu of what to do with him.',
  },
  {
    id: 'takedown',
    when: (world) => Boolean(world.hold),
    text: 'You have him. The menu by his head is your choices: Space (X) knocks him out. Q (Y) makes him '
      + 'talk: you get his radio code, so nobody misses him, and one more thing. F (Left Bumper) throws him '
      + 'down so you can run. Moving drags him. Choose within six seconds or he breaks free.',
  },
  {
    id: 'drop',
    when: (world) => Boolean(dropTarget(world)),
    text: 'You are right over a guard who has not noticed you. Press Space (or X) to drop on him: '
      + 'an instant knockout.',
  },
  {
    id: 'ladder',
    when: (world) => !world.room.outdoor && !world.player.hiddenIn && Boolean(climbableAt(world.room, world.player)),
    text: 'Hold W (or Up) to climb. Guards do not look up: from the pipes you can wait for one to pass '
      + 'underneath and drop on him.',
  },
  {
    id: 'ghost',
    when: (world) => lastSeenMarkers(world).length > 0,
    text: 'The pale ghost is where that guard THINKS you are. He will go there, not to you. '
      + 'It moves if a noise changes his mind, and fades when he gives up.',
  },
  {
    id: 'shove',
    when: (world) => !knockoutTarget(world) && Boolean(shoveTarget(world)) && shoveReady(world),
    text: 'He can see you, so no knockout. Press Space (or X) to shove him: he is stunned for a moment, '
      + 'so run. It is loud, and it takes a few seconds before you can do it again.',
  },
  {
    id: 'throw',
    when: (world) => Boolean(throwableInReach(world)),
    text: 'Press E (or A) to pick this up. Hold F (or Left Bumper) to aim, let go to throw. Hit a guard on the '
      + 'head to stun him, or land it somewhere to make him walk over and look.',
  },
  {
    id: 'yard',
    when: (world) => Boolean(world.room.outdoor),
    text: 'The Yard. K (or B) jumps: tap for a hop, hold to go higher. Hold W (or Up) at a ladder or a '
      + 'chain-link fence to climb. Keep out of the searchlights: they swing away at each end of their sweep, '
      + 'and solid cover casts a safe shadow.',
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
