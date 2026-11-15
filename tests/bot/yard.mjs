// A scripted bot for the Yard, where the planner cannot go: it only knows flat floors.
//
// Each leg is a fixed series of moves (walk here, jump there, climb). What makes a leg clean is
// when it starts. So for each leg the bot copies the world, waits a little, plays the leg on the
// copy, and checks that nobody noticed. It tries longer and longer waits until one works, then
// plays that for real. Guards and searchlights are the same every run, so the copy is exact.
import { stepWorld } from '../../site/js/game/world.js';
import { STEP, intent } from '../helpers.mjs';

const step = (world, keys = {}) => stepWorld(world, intent(keys), STEP);

function until(world, check, keys, label, maxSeconds = 20) {
  for (let i = 0; i < maxSeconds / STEP; i += 1) {
    if (check(world)) return;
    step(world, keys);
  }
  throw new Error(`stuck: ${label} (x ${world.player.x.toFixed(2)}, y ${world.player.y.toFixed(2)})`);
}

// ---------- Moves ----------

export const wait = (seconds, keys = {}) => (world) => {
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) step(world, keys);
};

// Walks (or runs, or crouch-walks) along the ground to x.
export const walkTo = (x, keys = {}) => (world) => {
  const dir = Math.sign(x - world.player.x);
  if (dir === 0) return;
  until(world, (w) => (x - w.player.x) * dir <= 0.03, { ...keys, moveX: dir }, `walk to ${x}`);
  step(world, keys);
};

// Walks to x, but hangs back from things ahead: `light` is the id of a searchlight to stay
// behind while it sweeps the same way, and `guard` the id of a guard to stay out of earshot of.
// A person does this by eye. If the light or the guard turns round, the leg simply fails.
export const trailTo = (x, { keys = {}, light = null, guard = null, lightGap = 0.5, guardGap = 2.65 } = {}) => (
  (world) => {
    const dir = Math.sign(x - world.player.x) || 1;
    const lamp = world.cameras.find((camera) => camera.id === light);
    const man = world.allGuards.find((entry) => entry.id === guard);
    for (let i = 0; i < 60 / STEP; i += 1) {
      const { player } = world;
      if ((x - player.x) * dir <= 0.03) return;
      let go = true;
      if (lamp && !lamp.off && !lamp.away && (lamp.x - player.x) * dir > 0) {
        go = (lamp.x - dir * lamp.halfWidth - player.x) * dir > lightGap;
      }
      if (man && (man.x - player.x) * dir > 0 && Math.abs(man.x - player.x) < guardGap) go = false;
      step(world, go ? { ...keys, moveX: dir } : keys);
    }
    throw new Error(`trail to ${x} took too long`);
  }
);

// Steers through the air toward x, stopping dead over it, until the player lands.
function fly(world, x, dir, keys) {
  for (let i = 0; i < 4 / STEP; i += 1) {
    if (world.player.onGround) return;
    step(world, { ...keys, moveX: (x - world.player.x) * dir > 0.03 ? dir : 0 });
  }
  throw new Error(`a jump toward ${x} never landed`);
}

// A full jump that comes down at x. keys can add run.
export const leapTo = (x, keys = {}) => (world) => {
  const dir = Math.sign(x - world.player.x) || 1;
  step(world, { ...keys, jump: true, moveX: dir });
  fly(world, x, dir, { ...keys, jump: true });
  step(world, keys);
};

// Holds Up at a ladder or a fence until standing at the top of it.
export const climbUp = () => (world) => {
  step(world, { up: true });
  until(world, (w) => !w.player.climbing && w.player.onGround, { up: true }, 'climb up');
  step(world);
};

// Holds Down at the top of a ladder until back on the ground.
export const climbDown = () => (world) => {
  step(world, { crouch: true });
  until(world, (w) => !w.player.climbing && w.player.onGround && w.player.y < 0.01, { crouch: true }, 'climb down');
  step(world);
};

// Climbs part of the way up and hangs there.
export const climbTo = (y) => (world) => {
  until(world, (w) => w.player.y >= y, { up: true }, `climb to ${y}`);
  step(world);
};

// Crouch plus jump standing still on a ledge: drops through it and falls to whatever is below.
export const dropDown = () => (world) => {
  step(world, { crouch: true, jump: true });
  step(world);
  until(world, (w) => w.player.onGround, {}, 'drop down', 4);
};

// Walks off an edge toward x and falls to the ground, steering to land at x.
export const stepOff = (x, keys = {}) => (world) => {
  const dir = Math.sign(x - world.player.x) || 1;
  until(world, (w) => !w.player.onGround, { ...keys, moveX: dir }, `step off toward ${x}`);
  fly(world, x, dir, keys);
};

// A dash jump (hold dash, jump): needs the work boots. Comes down at x.
export const dashLeapTo = (x) => (world) => {
  const dir = Math.sign(x - world.player.x) || 1;
  step(world, { dash: true, jump: true, moveX: dir });
  fly(world, x, dir, { dash: true, jump: true });
  step(world);
};

export const press = (button, check, keys = {}) => (world) => {
  until(world, check, { ...keys, [button]: true }, `press ${button}`, 6);
  step(world, keys);
};

// One fresh tap of a button.
export const tapKey = (button, keys = {}) => (world) => {
  step(world, { ...keys, [button]: true });
  step(world, keys);
};

// ---------- Legs ----------

// A glance is a guard half hearing something. A clean leg does not even cause that.
const NOTICED = new Set([
  'suspicious', 'alert', 'searching', 'searchlight', 'camera', 'yell', 'bodyFound', 'grab', 'glance',
]);

function play(world, moves) {
  for (const move of moves) move(world);
}

// Was the player noticed between event number `from` and now?
function noticed(world, from) {
  return world.events.slice(from).some((event) => NOTICED.has(event.type));
}

// Plays a leg at the first moment it can be done without being noticed.
// hold: the buttons held while waiting for that moment (crouch, to stay behind low cover).
// Returns the seconds waited. Throws if no moment in the next maxWait seconds works.
export function cleanLeg(world, name, moves, { hold = {}, maxWait = 90, every = 0.5 } = {}) {
  for (let delay = 0; delay <= maxWait; delay += every) {
    const copy = structuredClone(world);
    const from = copy.events.length;
    try {
      wait(delay, hold)(copy);
      play(copy, moves);
      // Stand still at the end for a moment: the place the leg ends must be safe too.
      wait(0.3, moves.endHold ?? hold)(copy);
    } catch {
      continue;
    }
    if (noticed(copy, from) || copy.over) continue;
    wait(delay, hold)(world);
    play(world, moves);
    return delay;
  }
  throw new Error(`no clean moment found for: ${name}`);
}
