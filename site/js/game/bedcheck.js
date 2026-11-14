// The bed check. When the timer reaches the set time, a guard walks to your cell and looks at
// your bed. You in bed, or a dummy in bed: he walks on. Empty bed: the whole prison goes Alert.
import { CONFIG } from './config.js';
import { alarmEverywhere } from './alert.js';
import { moveToward } from './guard.js';
import { say } from './messages.js';
import { inBed } from './run.js';

function bedSpot(world) {
  for (const room of Object.values(world.layout.rooms)) {
    const bed = (room.hideSpots ?? []).find((spot) => spot.type === 'bed');
    if (bed) return { room, bed };
  }
  return null;
}

// Called every step. Starts the check once, when the timer reaches the set time.
export function updateBedCheck(world, cfg = CONFIG) {
  if (world.bedCheck || world.timeLeft > cfg.bedCheckAtSecondsRemaining) return;
  const place = bedSpot(world);
  const checker = place && world.allGuards.find((g) => g.checksBed);
  // If he has walked next door on a radio check, the bed check waits until he is back.
  if (checker && checker.state !== 'out' && (checker.roomId !== place.room.id || checker.duty)) return;
  const guard = checker && checker.roomId === place.room.id ? checker : null;
  if (!guard || guard.state === 'out') {
    // Nobody is on their feet to do it.
    world.bedCheck = { result: 'skipped' };
    return;
  }
  world.bedCheck = { result: null, guardId: guard.id };
  // He stops a step short of the bed and looks at it.
  guard.duty = { type: 'bedCheck', x: place.bed.x + 1.3, bedX: place.bed.x, wait: cfg.bedCheck.lookSeconds };
  world.events.push({ type: 'bedCheck' });
  say(world, 'Bed check. A guard is on his way to your cell.');
}

function resolve(world) {
  let result = 'empty';
  if (inBed(world)) result = 'in-bed';
  else if (world.dummyInBed) result = 'dummy';
  world.bedCheck.result = result;
  world.events.push({ type: 'bedCheckDone', result });
  if (result !== 'empty') return;
  say(world, 'Your bed is empty. The whole prison is looking for you.', CONFIG.hintSeconds);
  alarmEverywhere(world);
}

// A calm guard with this duty walks to the bed, looks, and decides.
export function doBedCheck(guard, world, dt, cfg = CONFIG.guard) {
  const { duty } = guard;
  if (!moveToward(guard, duty.x, cfg.walkSpeed, dt)) return;
  guard.facing = Math.sign(duty.bedX - guard.x) || guard.facing;
  duty.wait -= dt;
  if (duty.wait > 0) return;
  guard.duty = null;
  resolve(world);
}

// Standing next to your bed with the bedsheets: make a dummy.
export function canPlaceDummy(world, cfg = CONFIG.hide) {
  const { player, room } = world;
  if (!player.hasBedsheets || world.dummyInBed || player.hiddenIn || player.dragging) return false;
  const bed = (room.hideSpots ?? []).find((spot) => spot.type === 'bed');
  return Boolean(bed) && Math.abs(bed.x - player.x) <= cfg.reach + 0.6;
}

export function placeDummy(world) {
  world.player.hasBedsheets = false;
  world.dummyInBed = true;
  world.events.push({ type: 'dummy' });
  say(world, 'You bunch the sheets into a body shape. From the door it looks like someone asleep.');
}
