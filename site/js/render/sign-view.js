// Signs on the gym's back wall, one over each part of the obstacle course, and the finish line.
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from '../../vendor/three.module.js';
import { block, placed } from './blocks.js';

const WALL_Z = -2;
const HEIGHT = 0.95;

function signTexture(sign, width) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * 96);
  canvas.height = Math.round(HEIGHT * 96);
  const pen = canvas.getContext('2d');
  pen.fillStyle = '#0b1014';
  pen.fillRect(0, 0, canvas.width, canvas.height);
  pen.textAlign = 'center';
  pen.textBaseline = 'middle';
  pen.fillStyle = '#f2d98a';
  pen.font = '700 34px ui-monospace, Menlo, Consolas, monospace';
  pen.fillText(sign.text, canvas.width / 2, canvas.height * 0.36);
  pen.fillStyle = '#9aa6b6';
  pen.font = '22px ui-monospace, Menlo, Consolas, monospace';
  pen.fillText(sign.hint ?? '', canvas.width / 2, canvas.height * 0.74);
  return new CanvasTexture(canvas);
}

export function createSignViews(room) {
  const group = new Group();
  const textures = [];
  for (const sign of room.signs ?? []) {
    // Wide enough for the longer of its two lines.
    const width = Math.max(3.2, Math.max(sign.text.length * 0.23, (sign.hint ?? '').length * 0.15) + 0.5);
    const texture = signTexture(sign, width);
    textures.push(texture);
    group.add(placed(block(width + 0.16, HEIGHT + 0.16, 0.08, 0x56606e), sign.x, 3.85, WALL_Z + 0.05));
    const face = new Mesh(new PlaneGeometry(width, HEIGHT), new MeshBasicMaterial({ map: texture }));
    group.add(placed(face, sign.x, 3.85, WALL_Z + 0.1));
  }
  if (room.finish) {
    // A checkered post and a bright line across the floor.
    for (let i = 0; i < 6; i += 1) {
      const color = i % 2 ? 0x111111 : 0xf0f0f0;
      const piece = block(0.25, 0.5, 0.25, color, i % 2 ? 0 : 0x404040);
      group.add(placed(piece, room.finish.x, 0.25 + i * 0.5, WALL_Z + 0.4));
    }
    group.add(placed(block(0.2, 0.03, 3.6, 0xf2d98a, 0x7a6a30), room.finish.x, 0.02, -0.2));
  }
  return { group, dispose: () => textures.forEach((texture) => texture.dispose()) };
}
