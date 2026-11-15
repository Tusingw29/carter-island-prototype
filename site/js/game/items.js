// Things you pick up with Interact. The keycard has its own rules in keycard.js.
import { CONFIG } from './config.js';
import { say } from './messages.js';

const PICKUPS = {
  screwdriver: { flag: 'hasScrewdriver', message: 'Screwdriver. Now those vent covers will open.' },
  cigarettes: { flag: 'hasCigarettes', message: 'Cigarettes. Somebody in the Cell Block will want these.' },
  bedsheets: { flag: 'hasBedsheets', message: 'Bedsheets. Stuff them in your bed to make a dummy.' },
  boots: {
    flag: 'hasBoots',
    message: 'Work boots. Now you can DASH: L (or Right Bumper). Dash in the air to cross wide gaps.',
  },
};

export const isPickup = (item) => Boolean(PICKUPS[item.type]);

export function pickupInReach(world, cfg = CONFIG.item) {
  const { player, room } = world;
  if (player.hiddenIn || player.dragging) return null;
  return (room.items ?? []).find((item) => (
    isPickup(item) && !world.taken.has(item.id) && Math.abs(item.x - player.x) <= cfg.reach
      && Math.abs((item.y ?? 0) - (player.y ?? 0)) <= 0.6
  )) ?? null;
}

export function pickUp(world, item) {
  const pickup = PICKUPS[item.type];
  world.taken.add(item.id);
  world.player[pickup.flag] = true;
  world.events.push({ type: 'pickup', itemId: item.id });
  say(world, pickup.message);
}
