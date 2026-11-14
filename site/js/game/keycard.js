// Taking the keycard. How you take it decides what happens next.
import { CONFIG } from './config.js';
import { disturb, isAwake } from './guard.js';
import { say } from './messages.js';

export function keycardInReach(world, cfg = CONFIG.item) {
  const { player, room } = world;
  if (player.hasKeycard || player.dragging || player.hiddenIn) return null;
  return (room.items ?? []).find((item) => (
    item.type === 'keycard' && Math.abs(item.x - player.x) <= cfg.reach
  )) ?? null;
}

const REASONS = {
  camera: (world) => `a camera saw you earlier${world.cameraSawIn ? ` in the ${world.cameraSawIn}` : ''}`,
  knockout: () => 'the office guard was knocked out',
};

// Why the silent alarm fired, in words. null if it has not.
export function silentAlarmReason(world) {
  if (!world.silentAlarm) return null;
  return world.silentAlarmReasons.map((reason) => REASONS[reason](world)).join(', and ');
}

// Every guard in the prison stays Suspicious for the rest of the run.
// reasons lists why: 'camera' (a camera saw you earlier) and/or 'knockout' (the office guard is out).
export function silentAlarm(world, reasons, cfg = CONFIG) {
  if (world.silentAlarm) return;
  world.silentAlarm = true;
  world.silentAlarmReasons = reasons;
  for (const guard of world.allGuards.filter(isAwake)) guard.wary = true;
  world.events.push({ type: 'silentAlarm', reasons });
  say(world, `SILENT ALARM: ${silentAlarmReason(world)}. Every guard is on edge now.`, cfg.alarmMessageSeconds);
}

// style is 'slow' (held, quiet) or 'fast' (tapped).
export function takeKeycard(world, style) {
  const sleepers = world.guards.filter((guard) => guard.sleeper);
  world.player.hasKeycard = true;
  world.keycardGrab = style;
  world.events.push({ type: 'keycard', style });
  if (style === 'fast') sleepers.forEach((guard) => disturb(guard));
  const reasons = [];
  if (world.seenByCamera) reasons.push('camera');
  if (sleepers.some((guard) => guard.state === 'out')) reasons.push('knockout');
  if (reasons.length > 0) silentAlarm(world, reasons);
}
