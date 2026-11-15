// Lit or hidden: could anything see the player right now?
// This asks the very same questions the guards, cameras, and snitches ask each step
// (guardCanSee, cameraCanSee, snitchCanSee), so the player's look on screen can never
// disagree with the rules.
import { cameraCanSee } from './camera.js';
import { isAwake } from './guard.js';
import { concealedIn } from './hiding.js';
import { litAreaAt } from './lights.js';
import { guardCanSee } from './senses.js';
import { snitchCanSee } from './snitch.js';

// Everything that has the player in view at this moment, as { kind, id }.
export function watchers(world) {
  const list = [];
  for (const guard of world.guards) {
    if (isAwake(guard) && guardCanSee(guard, world)) list.push({ kind: 'guard', id: guard.id });
  }
  for (const camera of world.cameras) {
    if (cameraCanSee(camera, world)) list.push({ kind: camera.kind ?? 'camera', id: camera.id });
  }
  for (const snitch of world.snitches) {
    if (snitchCanSee(snitch, world)) list.push({ kind: 'snitch', id: snitch.id });
  }
  return list;
}

// lit: standing in a lamp's light (and not inside a hiding spot). seenBy: who has you in view.
// visible is either of those. Hidden is everything else: a dark patch, shadow behind cover,
// a hiding spot, or simply out of every light.
export function playerVisibility(world) {
  const { player, room } = world;
  const lit = !concealedIn(player) && Boolean(litAreaAt(room, player));
  const seenBy = watchers(world);
  return { lit, seenBy, visible: lit || seenBy.length > 0 };
}

// What the player should look like: 'visible' (full color, glowing) or 'hidden' (a silhouette).
export const playerLook = (world) => (playerVisibility(world).visible ? 'visible' : 'hidden');
