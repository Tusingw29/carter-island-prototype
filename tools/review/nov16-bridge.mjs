// Review-only telemetry around unchanged production logic. Forecast clones are not measured.
import { createWorld as create, stepWorld as advance } from '../../site/js/game/world.js';
import { emptyIntent } from '../../site/js/game/intent.js';
export const observed = new WeakMap();
export function createWorld(...args) {
  const w = create(...args);
  observed.set(w, { grabs: [], captures: [], events: [], secondsByRoom: {} });
  for (let i = 0; i < Math.round((globalThis.nov16Delay ?? 0) * 120); i += 1) {
    stepWorld(w, emptyIntent(), 1 / 120);
  }
  return w;
}
const KEEP = new Set(['shove', 'shoveOff', 'fallLand', 'knockout', 'talk', 'checkInFaked',
  'missedCheckIn', 'doorsLock', 'pursuit', 'heat', 'free', 'grab', 'solitary', 'bodyFound']);
export function stepWorld(w, keys, dt, ...rest) {
  const m = observed.get(w);
  const before = { room: w.room.id, grab: Boolean(w.grab), solitary: w.solitary.used, count: w.events.length };
  advance(w, keys, dt, ...rest);
  if (!m) return;
  m.secondsByRoom[before.room] = (m.secondsByRoom[before.room] ?? 0) + dt;
  if (!before.grab && w.grab) m.grabs.push({ room: before.room, at: w.time, guard: w.grab.guardId });
  if (!before.solitary && w.solitary.used) m.captures.push({ room: before.room, at: w.time, kind: 'solitary' });
  if (w.over === 'caught') m.captures.push({ room: before.room, at: w.time, kind: 'final' });
  for (const event of w.events.slice(before.count)) {
    if (KEEP.has(event.type) && m.events.length < 150) m.events.push({ at: w.time, ...event });
  }
}
