// The Interact button for everything except the keycard, which has its own tap-or-hold rules.
import { CONFIG } from './config.js';
import { canPlaceDummy, placeDummy } from './bedcheck.js';
import { pickUp, pickupInReach } from './items.js';
import { say } from './messages.js';
import { canSleep, endRun } from './run.js';
import { talkToTrader, traderInReach } from './trader.js';

export function panelInReach(world, cfg = CONFIG.item) {
  const { player, room } = world;
  if (player.hiddenIn || player.dragging) return null;
  return (room.props ?? []).find((prop) => (
    prop.type === 'camera-panel' && Math.abs(prop.x - player.x) <= cfg.reach
  )) ?? null;
}

// The camera control panel: switches the camera it controls off, or back on.
export function usePanel(world, panel) {
  const camera = world.cameras.find((entry) => entry.id === panel.controls);
  camera.off = !camera.off;
  camera.sees = false;
  camera.exposure = 0;
  world.events.push({ type: 'panel', off: camera.off });
  say(world, `Stairwell camera: ${camera.off ? 'OFF' : 'ON'}`);
}

// What Interact would do right now: { kind, ... } or null.
export function interactTarget(world) {
  if (canSleep(world)) return { kind: 'sleep' };
  const item = pickupInReach(world);
  if (item) return { kind: 'pickup', item };
  const panel = panelInReach(world);
  if (panel) return { kind: 'panel', panel };
  if (canPlaceDummy(world)) return { kind: 'dummy' };
  const trader = traderInReach(world);
  if (trader) return { kind: 'trader', trader };
  return null;
}

export function pressInteract(world) {
  const target = interactTarget(world);
  if (!target) return null;
  if (target.kind === 'sleep') endRun(world, 'win');
  else if (target.kind === 'pickup') pickUp(world, target.item);
  else if (target.kind === 'panel') usePanel(world, target.panel);
  else if (target.kind === 'dummy') placeDummy(world);
  else if (target.kind === 'trader') talkToTrader(world);
  return target.kind;
}

// Walking up to the panel is enough to have found it, for the trader's hints.
export function noteFinds(world) {
  const panel = panelInReach(world);
  if (panel) world.found.add(panel.id);
}
