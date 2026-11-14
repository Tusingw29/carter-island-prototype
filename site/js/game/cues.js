// Things that make the headcount timer felt: PA announcements, the tick of the last minute,
// and where the wall clocks hang. The timer itself is not changed here.
import { CONFIG } from './config.js';

// Every PA announcement of a run, with the time left at which it plays. Latest first.
export function announcements(cfg = CONFIG) {
  const list = cfg.pa.headcountMinutes.map((minutes) => ({
    id: `headcount-${minutes}`,
    at: minutes * 60,
    text: `Headcount in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
  }));
  const bedCheckAt = cfg.bedCheckAtSecondsRemaining + cfg.pa.bedCheckWarningSeconds;
  list.push({ id: 'bed-check', at: bedCheckAt, text: 'Bed check' });
  return list.sort((a, b) => b.at - a.at);
}

// The announcements whose time was passed as the timer went from `before` down to `after`.
export function announcementsBetween(before, after, cfg = CONFIG) {
  return announcements(cfg).filter((entry) => before > entry.at && after <= entry.at);
}

export function announce(world, entry, cfg = CONFIG) {
  world.pa = { text: entry.text, until: world.time + cfg.pa.showSeconds };
  world.events.push({ type: 'pa', id: entry.id, text: entry.text });
}

export function currentAnnouncement(world) {
  return world.pa && world.time < world.pa.until ? world.pa.text : null;
}

// Seconds between ticks in the last minute. 0 means no ticking yet. It speeds up twice.
export function tickInterval(timeLeft, cfg = CONFIG) {
  if (timeLeft <= 0 || timeLeft > cfg.timerWarningSeconds) return 0;
  if (timeLeft > 30) return 1;
  return timeLeft > 10 ? 0.5 : 0.25;
}

// True on the step where a tick falls.
export function tickBetween(before, after, cfg = CONFIG) {
  const interval = tickInterval(after, cfg);
  return interval > 0 && Math.ceil(before / interval) !== Math.ceil(after / interval);
}

// Where the clocks hang on a room's back wall: close enough together that one is always on
// screen, and moved sideways if a camera or a high vent is in the way.
export function wallClockXs(room, cameras = room.cameras ?? [], cfg = CONFIG.pa) {
  const inTheWay = [
    ...cameras.map((camera) => (camera.min + camera.max) / 2),
    ...(room.portals ?? []).filter((portal) => portal.high).map((portal) => portal.x),
  ];
  const count = Math.ceil(room.width / cfg.clockSpacing);
  const xs = [];
  for (let i = 0; i < count; i += 1) {
    const ideal = ((i + 0.5) * room.width) / count;
    const free = [0, 2, -2, 3.5, -3.5].map((shift) => ideal + shift)
      .find((x) => inTheWay.every((other) => Math.abs(other - x) >= cfg.clockClearance));
    xs.push(free ?? ideal);
  }
  return xs;
}
