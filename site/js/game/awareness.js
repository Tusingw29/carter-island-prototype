// Heat-up detection. Everything that can spot the player (guards, cameras, searchlights,
// snitches) has its own awareness meter, from 0 (unaware) to 1 (spotted). While it has you in
// view the meter fills, slower if you crouch or stand still. Out of view it drains slowly, so
// stepping straight back into view picks up near where it left off.
import { CONFIG } from './config.js';
import { cameraMount } from './camera.js';
import { isAwake } from './guard.js';

export { stanceFactor } from './stance.js';

// Every meter in the room that is not empty, for drawing over its owner:
// { id, kind, x, y, fill (0 to 1), seeing (filling right now), full }.
// A meter that is draining has seeing false: it is drawn half faded.
export function awarenessMeters(world) {
  const here = (thing) => thing.roomId === world.room.id;
  const meters = [];
  for (const guard of world.guards.filter(isAwake)) {
    const fill = guard.state === 'alert' ? 1 : guard.detection;
    if (fill <= 0) continue;
    meters.push({
      id: guard.id, kind: 'guard', x: guard.x, y: (guard.y ?? 0) + 3, fill, seeing: guard.seesPlayer, full: fill >= 1,
    });
  }
  for (const camera of world.cameras.filter(here)) {
    if (camera.off || camera.awareness <= 0) continue;
    const mount = cameraMount(camera);
    const kind = camera.kind ?? 'camera';
    const fill = camera.awareness;
    meters.push({ id: camera.id, kind, x: mount.x, y: mount.y + 0.5, fill, seeing: camera.sees, full: fill >= 1 });
  }
  for (const snitch of world.snitches.filter(here)) {
    if (snitch.state !== 'awake' || snitch.awareness <= 0) continue;
    const fill = snitch.awareness;
    meters.push({ id: snitch.id, kind: 'snitch', x: snitch.x, y: 3.1, fill, seeing: snitch.sees, full: fill >= 1 });
  }
  return meters;
}

// The fullest meter that is still filling, 0 if none. Drives the rising sound.
export function heat(world) {
  const filling = awarenessMeters(world).filter((meter) => meter.seeing && !meter.full);
  return Math.max(0, ...filling.map((meter) => meter.fill));
}

// Called every step: adds a 'heat' event each time the fullest filling meter passes another
// fifth, so the sound steps up as you are about to be spotted.
export function updateHeat(world) {
  const stage = Math.min(4, Math.floor(heat(world) * 5));
  if (stage > world.heatStage) world.events.push({ type: `heat${stage}` });
  world.heatStage = stage;
}
