// The trader inmate. Bring him the cigarettes and he tells you about something you have not found.
import { CONFIG } from './config.js';
import { say } from './messages.js';

// In the order the spec lists them. He picks the first one you have not found.
export const HINTS = Object.freeze([
  {
    id: 'vents',
    found: (world) => world.knownPortals.has('ma-vent') || world.knownPortals.has('vd-west'),
    reveals: ['ma-vent'],
    text: 'Vent covers come off with a screwdriver. There is one in the Laundry. The vent in the '
      + 'Maintenance Hall goes all the way up to the Guard Office.',
  },
  {
    id: 'panel',
    found: (world) => world.found.has('ma-panel'),
    reveals: [],
    text: 'There is a control panel in the Maintenance Hall. It switches off the Stairwell camera.',
  },
  {
    id: 'drop',
    found: (world) => world.knownPortals.has('go-drop'),
    reveals: ['go-drop'],
    text: 'The floor vent in the Guard Office opens from the inside. It drops you straight back here.',
  },
]);

export function nextHint(world) {
  return HINTS.find((hint) => !hint.found(world)) ?? null;
}

export function traderInReach(world, cfg = CONFIG.item) {
  const { player, room } = world;
  if (!room.trader || player.hiddenIn || player.dragging) return null;
  return Math.abs(room.trader.x - player.x) <= cfg.reach ? room.trader : null;
}

// Interact at the trader's cell.
export function talkToTrader(world, cfg = CONFIG) {
  if (!world.player.hasCigarettes) {
    const line = world.traded
      ? 'Trader: "That is all I have got for you."'
      : 'Trader: "Bring me smokes from the Mess Hall kitchen and I will tell you something useful."';
    say(world, line);
    return null;
  }
  world.player.hasCigarettes = false;
  world.traded = true;
  const hint = nextHint(world);
  const text = hint ? hint.text : 'You already know everything I know. Thanks for the smokes.';
  // What he tells you about goes on your map, and in your notes.
  for (const id of hint?.reveals ?? []) world.knownPortals.add(id);
  world.notes.push(text);
  world.events.push({ type: 'hint', hintId: hint?.id ?? null });
  say(world, `Trader: "${text}"`, cfg.hintSeconds);
  return hint;
}
