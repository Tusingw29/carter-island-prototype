// A planning bot that finds a clean (never seen, never heard) way through a room.
//
// Guards and cameras are the same every run, so the bot first plays the future forward with
// the player out of sight, records where every guard and camera will be, then searches for
// the fastest series of moves that is never inside a flashlight, a camera, or earshot.
// The plan is then played for real through stepWorld, so times it reports are true game times.
import { CONFIG } from '../../site/js/game/config.js';
import { cameraSeesPlayer } from '../../site/js/game/camera.js';
import { isContainer } from '../../site/js/game/hiding.js';
import { sightBlockers } from '../../site/js/game/sight.js';
import { snitchWindow } from '../../site/js/game/snitch.js';
import { guardSeesPlayer } from '../../site/js/game/vision.js';
import { stepWorld } from '../../site/js/game/world.js';
import { STEP, intent } from '../helpers.mjs';

const SLICE_TICKS = 30;
const SLICE = SLICE_TICKS * STEP;
// How much room the bot leaves between itself and anything that could see or hear it, in metres.
// withSafety runs a piece of planning with a bigger margin, to measure how much slack a route has.
const DEFAULT_SAFETY = 0.3;
let SAFETY = DEFAULT_SAFETY;
export function withSafety(margin, action) {
  SAFETY = margin;
  try {
    return action();
  } finally {
    SAFETY = DEFAULT_SAFETY;
  }
}
const SAMPLE_EVERY = 6;

// Records every guard and camera for the next `seconds`, one entry per game tick.
export function forecast(world, seconds) {
  const ghost = structuredClone(world);
  ghost.player.hiddenIn = 'nowhere';
  ghost.timeLeft = Infinity;
  const frames = [];
  for (let i = 0; i <= Math.ceil(seconds / STEP); i += 1) {
    frames.push({
      guards: ghost.allGuards.map((g) => ({ x: g.x, facing: g.facing, state: g.state, roomId: g.roomId })),
      cameras: ghost.cameras.map((c) => ({ ...c })),
      snitches: ghost.snitches.filter((s) => s.state === 'awake')
        .map((s) => ({ roomId: s.roomId, window: snitchWindow(s) })),
    });
    stepWorld(ghost, intent(), STEP);
  }
  return frames;
}

const CELL = 0.1;

// For one moment in time, marks every 10 cm of floor where a player in the open would be seen.
// Worked out once per moment and stance, then looked up, which keeps the search fast.
function seenCells(frame, room, crouching) {
  const key = `${room.id}:${crouching}`;
  frame.seenCells ??= {};
  if (frame.seenCells[key]) return frame.seenCells[key];
  const cells = new Uint8Array(Math.ceil(room.width / CELL) + 1);
  const mark = (from, to, test) => {
    const first = Math.max(0, Math.floor(from / CELL));
    const last = Math.min(cells.length - 1, Math.ceil(to / CELL));
    for (let i = first; i <= last; i += 1) if (!cells[i] && test(i * CELL)) cells[i] = 1;
  };
  // Solid cover blocks sight, for guards and cameras alike.
  const blockers = sightBlockers(room);
  const standIn = (x) => ({ x, crouching, hiddenIn: null, inDark: null });
  for (const guard of frame.guards) {
    if (guard.roomId !== room.id || guard.state === 'out' || guard.state === 'asleep') continue;
    const reach = CONFIG.guard.coneRange + 0.5;
    const sees = (x) => guardSeesPlayer(guard, standIn(x), undefined, undefined, blockers);
    mark(Math.min(guard.x, guard.x + guard.facing * reach), Math.max(guard.x, guard.x + guard.facing * reach), sees);
  }
  for (const camera of frame.cameras) {
    if (camera.roomId !== room.id || camera.off || camera.away) continue;
    const sees = (x) => cameraSeesPlayer(camera, standIn(x), blockers);
    mark(camera.x - camera.halfWidth, camera.x + camera.halfWidth, sees);
  }
  for (const snitch of frame.snitches) {
    if (snitch.roomId === room.id) mark(snitch.window[0], snitch.window[1], () => true);
  }
  frame.seenCells[key] = cells;
  return cells;
}

// Would a player in the open at x (give or take a safety margin) be seen at this moment?
function seen(frame, room, x, crouching) {
  const cells = seenCells(frame, room, crouching);
  const first = Math.max(0, Math.floor((x - SAFETY) / CELL));
  const last = Math.min(cells.length - 1, Math.ceil((x + SAFETY) / CELL));
  for (let i = first; i <= last; i += 1) if (cells[i]) return true;
  return false;
}

function heard(frame, roomId, x, radius) {
  if (radius <= 0) return false;
  return frame.guards.some((g) => g.roomId === roomId && g.state !== 'out' && Math.abs(g.x - x) <= radius + SAFETY);
}

const MOVES = [
  { name: 'crouch', speed: CONFIG.player.crouchSpeed, noise: 0, keys: { crouch: true }, crouching: true },
  { name: 'walk', speed: CONFIG.player.walkSpeed, noise: CONFIG.noise.walkRadius, keys: {}, crouching: false },
  { name: 'run', speed: CONFIG.player.runSpeed, noise: CONFIG.noise.runRadius, keys: { run: true }, crouching: false },
];

// Is the player safe for one slice, starting at tick, going from x0 to x1 in the open?
function sliceSafe(frames, tick, room, x0, x1, move, darkSpots, wasStill = false) {
  const still = x0 === x1;
  const inDark = still && darkSpots.some((spot) => Math.abs(spot.x - x0) <= spot.halfWidth - 0.05);
  for (let i = 0; i <= SLICE_TICKS; i += SAMPLE_EVERY) {
    const frame = frames[tick + i];
    if (!frame) return false;
    const x = x0 + ((x1 - x0) * i) / SLICE_TICKS;
    // Standing still in a dark spot hides you from the first tick after you stop.
    if (inDark && (i > 0 || wasStill)) continue;
    if (seen(frame, room, x, move.crouching)) return false;
    if (!still && heard(frame, room.id, x, move.noise)) return false;
  }
  return true;
}

function expand(node, frames, room, darkSpots) {
  const next = [];
  const tick = node.tick;
  const spots = (room.hideSpots ?? []).filter(isContainer);
  const min = CONFIG.player.wallMargin;
  const max = room.width - CONFIG.player.wallMargin;
  const add = (x, hidden, keys, still = false) => {
    next.push({ tick: tick + SLICE_TICKS, x, hidden, keys, still, from: node });
  };

  if (node.hidden) {
    const spot = spots.find((s) => s.id === node.hidden);
    const halfWidth = spot.halfWidth ?? 0;
    add(node.x, node.hidden, {});
    for (const dir of [-1, 1]) {
      const x = Math.max(spot.x - halfWidth, Math.min(spot.x + halfWidth, node.x + dir * MOVES[0].speed * SLICE));
      if (x !== node.x) add(x, node.hidden, { moveX: dir });
    }
    const canStepOut = sliceSafe(frames, tick, room, node.x, node.x, MOVES[0], darkSpots);
    if (canStepOut) add(node.x, null, { up: true, crouch: true });
    return next;
  }

  const canWait = sliceSafe(frames, tick, room, node.x, node.x, MOVES[0], darkSpots, node.still);
  if (canWait) add(node.x, null, { crouch: true }, true);
  // In the duct you can only crawl.
  for (const move of room.crawl ? MOVES.slice(0, 1) : MOVES) {
    for (const dir of [-1, 1]) {
      const x = Math.max(min, Math.min(max, node.x + dir * move.speed * SLICE));
      // Only creep up to the end walls: running into a hall carries the noise into the next room.
      if (move.noise > 0 && (x === min || x === max)) continue;
      if (x !== node.x && sliceSafe(frames, tick, room, node.x, x, move, darkSpots)) {
        add(x, null, { moveX: dir, ...move.keys });
      }
    }
  }
  for (const spot of spots) {
    const halfWidth = spot.halfWidth ?? 0;
    if (Math.max(0, Math.abs(spot.x - node.x) - halfWidth) > CONFIG.hide.reach - 0.05) continue;
    add(Math.max(spot.x - halfWidth, Math.min(spot.x + halfWidth, node.x)), spot.id, { up: true });
  }
  return next;
}

// Finds the fastest clean way from where the player is to goal.x in the current room.
// goal: { x, tolerance, hidden (spot id to end inside), holdSeconds (must then be able to stand
// still unseen this long), arrive: { roomId, x } (the next room must be safe to step into) }.
export function plan(world, goal, maxSeconds = 150) {
  const frames = goal.frames ?? forecast(world, maxSeconds + 10);
  const room = world.room;
  const darkSpots = (room.hideSpots ?? []).filter((spot) => spot.type === 'dark');
  const holdSlices = Math.ceil((goal.holdSeconds ?? 0) / SLICE);
  const tolerance = goal.tolerance ?? 0.02;

  const reached = (node) => {
    if (Math.abs(node.x - goal.x) > tolerance) return false;
    if ((goal.hidden ?? null) !== node.hidden) return false;
    for (let i = 0; i < holdSlices; i += 1) {
      const tick = node.tick + i * SLICE_TICKS;
      if (!sliceSafe(frames, tick, room, node.x, node.x, MOVES[0], darkSpots, node.still || i > 0)) return false;
    }
    if (!goal.arrive) return true;
    const arriveTick = node.tick + holdSlices * SLICE_TICKS;
    for (let i = 0; i <= 2 * SLICE_TICKS; i += SAMPLE_EVERY) {
      const frame = frames[arriveTick + i];
      if (!frame || seen(frame, world.layout.rooms[goal.arrive.roomId], goal.arrive.x, false)) return false;
    }
    return true;
  };

  const start = { tick: 0, x: world.player.x, hidden: world.player.hiddenIn, keys: null, from: null };
  // Already standing still in the dark counts as hidden from the first moment.
  start.still = Boolean(world.player.inDark);
  let layer = [start];
  for (let slice = 0; slice * SLICE <= maxSeconds; slice += 1) {
    const done = layer.find(reached);
    if (done) {
      const steps = [];
      for (let node = done; node.from; node = node.from) steps.unshift(node.keys);
      return steps;
    }
    const best = new Map();
    for (const node of layer) {
      for (const child of expand(node, frames, room, darkSpots)) {
        const key = `${child.hidden ?? ''}:${child.still ? 's' : ''}:${Math.round(child.x * 10)}`;
        if (!best.has(key)) best.set(key, child);
      }
    }
    layer = [...best.values()];
  }
  return null;
}

// Plays a plan for real. The Up button is pressed for one tick only, so it counts as a tap.
export function follow(world, steps) {
  for (const keys of steps) {
    for (let i = 0; i < SLICE_TICKS; i += 1) {
      stepWorld(world, intent({ ...keys, up: Boolean(keys.up) && i === 0 }), STEP);
    }
  }
}

// Holds one button until check(world) is true.
export function holdUntil(world, keys, check, maxSeconds = 5) {
  for (let i = 0; i < maxSeconds / STEP; i += 1) {
    if (check(world)) return;
    stepWorld(world, intent(keys), STEP);
  }
  throw new Error(`holding ${JSON.stringify(keys)} never worked`);
}

export function release(world) {
  stepWorld(world, intent(), STEP);
}
