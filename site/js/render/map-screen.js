// The map screen: rooms you have entered and the ways between them, drawn as a simple SVG.
import { mapModel } from '../game/map.js';

const CELL_W = 190;
const CELL_H = 70;
const GAP_X = 46;
const GAP_Y = 44;
const TOP_FLOOR = 2;
const FLOOR_NAMES = ['BASEMENT', 'FLOOR 1', 'FLOOR 2'];
const LABEL_W = 96;

function box(room) {
  const x = LABEL_W + room.col * (CELL_W + GAP_X);
  const y = (TOP_FLOOR - room.floor) * (CELL_H + GAP_Y);
  const w = room.span * CELL_W + (room.span - 1) * GAP_X;
  return { x, y, w, h: CELL_H, cx: x + w / 2, cy: y + CELL_H / 2 };
}

function roomSvg(room) {
  const b = box(room);
  if (!room.visited) return '';
  const here = room.current ? ' here' : '';
  return `<rect class="room${here}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="4"/>`
    + `<text class="name" x="${b.cx}" y="${b.cy + 4}">${room.name}</text>`
    + (room.current ? `<text class="you" x="${b.cx}" y="${b.y + b.h - 8}">YOU ARE HERE</text>` : '');
}

// A line between two rooms. Rooms on the same floor join side to side, others join up and down.
function linkSvg(link, rooms) {
  if (!link.known) return '';
  const a = box(rooms.get(link.from));
  const b = box(rooms.get(link.to));
  const style = `link ${link.type}${link.creaky ? ' creaky' : ''}`;
  if (rooms.get(link.from).floor === rooms.get(link.to).floor) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    return `<line class="${style}" x1="${left.x + left.w}" y1="${left.cy}" x2="${right.x}" y2="${right.cy}"/>`;
  }
  const [upper, lower] = a.y < b.y ? [a, b] : [b, a];
  const overlap = Math.min(upper.x + upper.w, lower.x + lower.w) - Math.max(upper.x, lower.x);
  if (overlap > 0) {
    // One above the other: straight down. Vents are drawn a little to one side of stairs.
    const x = Math.max(upper.x, lower.x) + overlap / 2 + (link.type === 'vent' ? overlap / 4 : 0);
    return `<line class="${style}" x1="${x}" y1="${upper.y + upper.h}" x2="${x}" y2="${lower.y}"/>`;
  }
  // Not lined up: down from the upper room, across in the gap between floors, down into the lower one.
  const fromX = upper.x + upper.w * 0.15;
  const toX = lower.x + lower.w * 0.85;
  const midY = upper.y + upper.h + GAP_Y / 2;
  return `<polyline class="${style}" points="${fromX},${upper.y + upper.h} ${fromX},${midY} ${toX},${midY} `
    + `${toX},${lower.y}"/><text class="note" x="${(fromX + toX) / 2}" y="${midY - 5}">one-way drop</text>`;
}

// A room you know is there (you have seen the way to it) but have not entered yet.
function unknownSvg(room, links) {
  const known = links.some((link) => link.known && (link.from === room.id || link.to === room.id));
  if (room.visited || !known) return '';
  const b = box(room);
  return `<rect class="room unknown" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="4"/>`
    + `<text class="name unknown" x="${b.cx}" y="${b.cy + 4}">?</text>`;
}

export function createMapScreen() {
  const screen = document.getElementById('map-screen');
  const svg = document.getElementById('map-svg');
  let lastKey = '';

  function update(world, open) {
    screen.hidden = !open;
    if (!open) return;
    const model = mapModel(world);
    const key = JSON.stringify(model);
    if (key === lastKey) return;
    lastKey = key;
    const rooms = new Map(model.rooms.map((room) => [room.id, room]));
    const cols = Math.max(...model.rooms.map((room) => room.col + room.span));
    const width = LABEL_W + cols * (CELL_W + GAP_X);
    const height = (TOP_FLOOR + 1) * (CELL_H + GAP_Y) - GAP_Y;
    const floors = FLOOR_NAMES.map((name, floor) => (
      `<text class="floor" x="0" y="${(TOP_FLOOR - floor) * (CELL_H + GAP_Y) + CELL_H / 2 + 4}">${name}</text>`
    )).join('');
    svg.setAttribute('viewBox', `-6 -6 ${width + 12} ${height + 12}`);
    // Vents are drawn last, over the rooms, because the duct climbs through the Mess Hall wall.
    const vents = model.links.filter((link) => link.type === 'vent');
    const others = model.links.filter((link) => link.type !== 'vent');
    svg.innerHTML = floors
      + others.map((link) => linkSvg(link, rooms)).join('')
      + model.rooms.map((room) => unknownSvg(room, model.links)).join('')
      + model.rooms.map(roomSvg).join('')
      + vents.map((link) => linkSvg(link, rooms)).join('');
  }
  return { update };
}
