// The map screen's contents: which rooms and connections the player has found so far.
import { findPortal } from './portals.js';

export function mapModel(world) {
  const all = Object.values(world.layout.rooms);
  const rooms = all.map((room) => ({
    id: room.id,
    name: room.name,
    floor: room.floor ?? 0,
    col: room.col ?? 0,
    span: room.span ?? 1,
    visited: world.visited.has(room.id),
    current: world.room.id === room.id,
  }));

  const links = [];
  const seen = new Set();
  for (const room of all) {
    for (const portal of room.portals ?? []) {
      const pair = [portal.id, portal.toPortal].sort().join('|');
      if (seen.has(pair)) continue;
      seen.add(pair);
      const other = findPortal(world.layout, portal.toPortal);
      // You can see a door from inside a room even if you have not gone through it.
      // Vents and other hidden ways only show once used or discovered.
      const hidden = portal.hidden || other?.portal.hidden;
      const known = world.knownPortals.has(portal.id) || world.knownPortals.has(portal.toPortal)
        || (!hidden && (world.visited.has(room.id) || world.visited.has(portal.to)));
      links.push({ id: pair, type: portal.type, from: room.id, to: portal.to, creaky: Boolean(portal.creaky), known });
    }
  }
  return { rooms, links };
}
