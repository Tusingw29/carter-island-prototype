// The map screen's contents: which rooms and connections the player has found so far.
//
// A room can have mapParts: stretches of it that get their own box on the map, such as the
// Yard's roof ledge. Each is { id, name, floor, col, zone: { from, to, minY }, link } and shows
// once the player has stood in its zone. A portal with mapPart joins that box instead of the room.
// A room can also have mapMarks: names of landmarks drawn on its box, such as the two towers.
import { findPortal } from './portals.js';

// The part of the current room the player is standing in right now, or null.
export function currentPart(world) {
  const { player, room } = world;
  if (!player.onGround) return null;
  return (room.mapParts ?? []).find(({ zone }) => (
    player.x >= zone.from && player.x <= zone.to && (player.y ?? 0) >= zone.minY
  )) ?? null;
}

// Called every step: remembers the parts the player has reached.
export function notePlaces(world) {
  const part = currentPart(world);
  if (part) world.visitedParts.add(part.id);
}

// The guards of a room whose patrols are showing, each as { from, to, at } in shares of the
// room's width (0 is its left wall, 1 its right). Empty unless a guard has just given them up.
export function revealedPatrols(world, room) {
  const reveal = world.patrolReveal;
  if (!reveal || reveal.roomId !== room.id || world.time >= reveal.until) return [];
  return world.allGuards.filter((guard) => guard.homeRoomId === room.id && guard.state !== 'out')
    .map((guard) => ({
      from: guard.patrolMin / room.width, to: guard.patrolMax / room.width, at: guard.x / room.width,
      high: (guard.y ?? 0) > 0,
    }));
}

export function mapModel(world) {
  const all = Object.values(world.layout.rooms);
  const here = currentPart(world);
  const rooms = [];
  for (const room of all) {
    rooms.push({
      id: room.id,
      name: room.name,
      floor: room.floor ?? 0,
      col: room.col ?? 0,
      span: room.span ?? 1,
      visited: world.visited.has(room.id),
      current: world.room.id === room.id && !here,
      marks: world.visited.has(room.id) ? (room.mapMarks ?? []) : [],
      patrols: revealedPatrols(world, room),
    });
    for (const part of room.mapParts ?? []) {
      rooms.push({
        id: part.id,
        name: part.name,
        floor: part.floor,
        col: part.col,
        span: 1,
        visited: world.visitedParts.has(part.id),
        current: here?.id === part.id,
        marks: [],
        patrols: [],
      });
    }
  }

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
      links.push({
        id: pair,
        type: portal.type,
        from: portal.mapPart ?? room.id,
        to: other?.portal.mapPart ?? portal.to,
        creaky: Boolean(portal.creaky),
        known,
      });
    }
    // How a part joins the rest of its room: the Yard's roof is reached by the tower ladders.
    for (const part of room.mapParts ?? []) {
      links.push({
        id: `${part.id}|${room.id}`, type: part.link ?? 'ladder', from: part.id, to: room.id, creaky: false,
        known: world.visitedParts.has(part.id),
      });
    }
  }
  return { rooms, links };
}
