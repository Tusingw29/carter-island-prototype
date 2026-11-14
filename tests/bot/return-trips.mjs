// The "why was the way home so hard?" check: clean trips from the Guard Office back to bed,
// with and without the silent alarm, for each way in and each way home.
import { createWorld } from '../../site/js/game/world.js';
import { run } from '../helpers.mjs';
import { withSafety } from './planner.mjs';
import {
  goToBedAndSleep, leaveByDoor, leaveByHall, liftKeycard, pickUpItem,
} from './routes.mjs';

export const WAYS_IN = {
  'front door': (world, log) => {
    leaveByHall(world, 'cb-east', log);
    leaveByHall(world, 'mh-east', log);
    leaveByDoor(world, 'sw-door', log);
  },
  vents: (world, log) => {
    leaveByDoor(world, 'cb-stairs', log);
    pickUpItem(world, 'screwdriver', log);
    leaveByDoor(world, 'la-door', log);
    leaveByDoor(world, 'ma-vent', log);
    leaveByDoor(world, 'vd-east', log);
  },
};

export const WAYS_HOME = {
  'front door': (world, log) => {
    leaveByDoor(world, 'go-door', log);
    leaveByHall(world, 'sw-west', log);
    leaveByHall(world, 'mh-west', log);
  },
  'one-way drop': (world, log) => leaveByDoor(world, 'go-drop', log),
};

// alarm: true makes the keycard grab set off the silent alarm, as if a camera saw you long ago.
// delay: seconds spent waiting in the office before the grab. The alarm makes guards walk faster
// from the moment it fires, so the moment of the grab decides how their patrols line up afterwards.
// margin: how far the bot stays from every beam and every guard's hearing on the way home.
// The default is tight, which only perfect timing manages. A bigger one is closer to a person.
// Returns { possible, seconds (keycard in hand to asleep), blockedIn, world, log }.
export function returnTrip(wayIn, wayHome, alarm, delay = 0, margin = 0.3) {
  const world = createWorld();
  const log = [];
  world.seenByCamera = alarm;
  WAYS_IN[wayIn](world, log);
  if (delay > 0) run(world, { crouch: true }, delay);
  liftKeycard(world, log);
  const started = world.time;
  const homeLog = [];
  try {
    withSafety(margin, () => {
      WAYS_HOME[wayHome](world, homeLog);
      goToBedAndSleep(world, homeLog);
    });
  } catch (error) {
    return { possible: false, blockedIn: world.room.name, reason: error.message, world, log: homeLog };
  }
  return { possible: true, seconds: world.time - started, world, log: homeLog };
}
