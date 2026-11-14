// Clocks on the back wall showing the time left until headcount.
// The digits are drawn on one small canvas shared by every clock in the room, and only
// redrawn when the text changes, so they cost next to nothing.
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from '../../vendor/three.module.js';
import { formatClock } from '../game/clock.js';
import { CONFIG } from '../game/config.js';
import { wallClockXs } from '../game/cues.js';
import { block, placed } from './blocks.js';

const WALL_Z = -2;
const WIDTH = 1.5;
const HEIGHT = 0.66;
const NORMAL = '#ffb03a';
const LAST_MINUTE = '#ff4a3c';
const FLASH = '#fff0e8';

export function createWallClock(room, cameras) {
  const group = new Group();
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 84;
  const pen = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  const face = new MeshBasicMaterial({ map: texture });
  // The duct is too low for a full-size clock.
  const scale = room.crawl ? 0.5 : 1;
  const y = room.crawl ? 0.55 : 4.02;
  for (const x of wallClockXs(room, cameras)) {
    const clock = new Group();
    clock.add(block(WIDTH, HEIGHT, 0.1, 0x10141a));
    clock.add(placed(new Mesh(new PlaneGeometry(WIDTH - 0.14, HEIGHT - 0.14), face), 0, 0, 0.06));
    clock.scale.setScalar(scale);
    group.add(placed(clock, x, y, WALL_Z + 0.06));
  }
  let shown = '';

  function update(world) {
    const text = formatClock(world.timeLeft);
    const lastMinute = world.timeLeft <= CONFIG.timerWarningSeconds;
    // In the last minute the digits flash for the first part of every second.
    const flash = lastMinute && world.timeLeft % 1 > 0.7;
    const key = `${text}${lastMinute}${flash}`;
    if (key === shown) return;
    shown = key;
    pen.fillStyle = '#05070b';
    pen.fillRect(0, 0, canvas.width, canvas.height);
    pen.fillStyle = flash ? FLASH : (lastMinute ? LAST_MINUTE : NORMAL);
    pen.font = '700 64px ui-monospace, Menlo, Consolas, monospace';
    pen.textAlign = 'center';
    pen.textBaseline = 'middle';
    pen.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
    texture.needsUpdate = true;
  }
  return { group, update, dispose: () => texture.dispose() };
}
