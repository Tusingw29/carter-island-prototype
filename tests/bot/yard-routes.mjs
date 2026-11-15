// Whole runs that go through the Yard, built from clean legs. Used by tests and to report times.
import { createWorld } from '../../site/js/game/world.js';
import { holdUntil, release } from './planner.mjs';
import {
  goToBedAndSleep, leaveByDoor, leaveByHall, liftKeycard,
} from './routes.mjs';
import {
  cleanLeg, climbDown, climbTo, climbUp, dashLeapTo, leapTo, stepOff, tapKey, trailTo, walkTo,
} from './yard.mjs';

const CROUCH = { crouch: true };
const RUN = { run: true };
const LIGHT_1 = 'yd-light-1';
const GUARD = 'yd-guard';

function leg(world, log, name, moves, { hold = {}, endHold = hold } = {}) {
  const started = world.time;
  const steps = [...moves];
  steps.endHold = endHold;
  const waited = cleanLeg(world, name, steps, { hold });
  log.push({ room: `Yard: ${name}`, seconds: world.time - started, waited });
}

// From the Yard door: over the low fence and down behind the bench, in its shadow.
function doorToBench(world, log) {
  const moves = [walkTo(6.9), leapTo(9.3), walkTo(11), walkTo(12.2, CROUCH)];
  leg(world, log, 'door to the bench', moves, { endHold: CROUCH });
}

// Across the court behind the searchlight, to the scorer's table.
function benchToTable(world, log) {
  const moves = [leapTo(13.3), stepOff(14.6), trailTo(27.6, { light: LIGHT_1 }), walkTo(28.2, CROUCH)];
  leg(world, log, 'across the court', moves, { hold: CROUCH });
}

// Over the table and after the guard as he walks away, then up the ladder out of his sight.
function tableToLadder(world, log, top = false) {
  const moves = [leapTo(29.2), stepOff(30.4), trailTo(36.8, { guard: GUARD }), top ? climbUp() : climbTo(3.2)];
  const name = top ? 'behind the guard, up Tower 1' : 'behind the guard, onto the ladder';
  leg(world, log, name, moves, { hold: CROUCH, endHold: {} });
}

// Down the ladder, up the bleachers, across the fence top and the crates, onto the shed roof.
function ladderToShed(world, log) {
  leg(world, log, 'bleachers, fence top, crates, shed roof', [
    climbDown(), walkTo(39.2), leapTo(40.9), leapTo(43.3), walkTo(43.8), leapTo(45.9), walkTo(46.9),
    leapTo(49.5, RUN), leapTo(53.7, RUN), walkTo(54.8), leapTo(58.5, RUN), walkTo(61), tapKey('up'),
  ]);
}

function bootsAndOut(world, log) {
  leg(world, log, 'work boots, out by the shed door', [walkTo(4.5), tapKey('interact'), walkTo(7), tapKey('up')]);
}

// Back over the crates and the fence top to the top row of the bleachers.
function shedToBleachers(world, log) {
  leg(world, log, 'back over the crates and fence', [
    walkTo(57.1), leapTo(55.9), leapTo(55), leapTo(54.2), walkTo(53.6), leapTo(49.5, RUN), leapTo(46.6),
  ]);
}

function bleachersToLadder(world, log, top = false) {
  const moves = [stepOff(44.2), stepOff(41.8), stepOff(39.6), walkTo(37.2), top ? climbUp() : climbTo(2.4)];
  leg(world, log, top ? 'down the bleachers, up Tower 1' : 'down the bleachers, onto the ladder', moves);
}

// Lets the guard walk by underneath, then down and west to the table before he turns.
function ladderToTable(world, log) {
  const moves = [climbDown(), walkTo(30.4), leapTo(29.2), stepOff(28), walkTo(28.2, CROUCH)];
  leg(world, log, 'past the guard to the table', moves, { endHold: CROUCH });
}

// West behind the searchlight, then up the bench, rim, backboard, and pole to the roof ledge.
function tableToRoofByHoop(world, log) {
  leg(world, log, 'hoop climb to the roof', [
    trailTo(14.7, { light: LIGHT_1 }), leapTo(13.3), leapTo(15), leapTo(16.2), leapTo(18.4), leapTo(18.5),
  ], { hold: CROUCH, endHold: {} });
}

// Along the roof ledge, a dash jump across the gap to the sill, and in through the window.
function roofToWindow(world, log) {
  leg(world, log, 'roof ledge, dash, window', [walkTo(11.4), dashLeapTo(4.5), walkTo(3), tapKey('up')]);
}

function start(log) {
  const world = createWorld();
  leaveByHall(world, 'cb-east', log);
  leaveByDoor(world, 'mh-yard', log);
  return world;
}

function finish(world, log) {
  liftKeycard(world, log);
  leaveByDoor(world, 'go-drop', log);
  goToBedAndSleep(world, log);
  return { world, log, seconds: world.time };
}

// Just the boots: from bed to standing outside the shed with them on. Returns the time taken.
export function bootsTrip() {
  const log = [];
  const world = start(log);
  doorToBench(world, log);
  benchToTable(world, log);
  tableToLadder(world, log);
  ladderToShed(world, log);
  bootsAndOut(world, log);
  return { world, log, seconds: world.time };
}

// The Ghost way: boots first, then back across the court and up the hoop to the roof.
export function bootsThenRoofByHoopRun() {
  const { world, log } = bootsTrip();
  shedToBleachers(world, log);
  bleachersToLadder(world, log);
  ladderToTable(world, log);
  tableToRoofByHoop(world, log);
  roofToWindow(world, log);
  return finish(world, log);
}

// The tower way: boots first, then up Tower 1, knock out its guard, and jump to the roof.
export function bootsThenRoofByTowerRun() {
  const { world, log } = bootsTrip();
  shedToBleachers(world, log);
  bleachersToLadder(world, log, true);
  leg(world, log, 'knock out the tower guard', [walkTo(35.5, CROUCH), tapKey('action')]);
  leg(world, log, 'tower to roof, dash, window', [
    walkTo(33.7), leapTo(31), walkTo(11.4, RUN), dashLeapTo(4.5), walkTo(3), tapKey('up'),
  ]);
  return finish(world, log);
}

// Leaves the Guard Office by the window and goes home through the Yard and the Mess Hall.
export function homeByWindow(world, log) {
  leaveByDoor(world, 'go-window', log);
  leg(world, log, 'off the sill, to the door', [stepOff(5.6), walkTo(1.5)]);
  holdUntil(world, { up: true, crouch: true }, (w) => w.room.id === 'mess-hall');
  release(world);
  leaveByHall(world, 'mh-west', log);
  goToBedAndSleep(world, log);
  return { world, log, seconds: world.time };
}

export { start as startInYard, finish as finishFromOffice };
