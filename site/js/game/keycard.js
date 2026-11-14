// Taking the keycard. How you take it decides what happens next.
import { CONFIG } from './config.js';
import { disturb, isAwake } from './guard.js';

export function keycardInReach(world, cfg = CONFIG.item) {
  const { player, room } = world;
  if (player.hasKeycard || player.dragging || player.hiddenIn) return null;
  return (room.items ?? []).find((item) => (
    item.type === 'keycard' && Math.abs(item.x - player.x) <= cfg.reach
  )) ?? null;
}

// Every guard in the prison stays Suspicious for the rest of the run.
export function silentAlarm(world) {
  if (world.silentAlarm) return;
  world.silentAlarm = true;
  for (const guard of world.allGuards.filter(isAwake)) guard.wary = true;
  world.events.push({ type: 'silentAlarm' });
}

// style is 'slow' (held, quiet) or 'fast' (tapped).
export function takeKeycard(world, style) {
  const sleepers = world.guards.filter((guard) => guard.sleeper);
  world.player.hasKeycard = true;
  world.keycardGrab = style;
  world.events.push({ type: 'keycard', style });
  if (style === 'fast') sleepers.forEach((guard) => disturb(guard));
  if (world.seenByCamera || sleepers.some((guard) => guard.state === 'out')) silentAlarm(world);
}
