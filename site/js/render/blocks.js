// Helper for the block look: one flat-colored box.
import { BoxGeometry, Mesh, MeshLambertMaterial } from '../../vendor/three.module.js';

export function block(width, height, depth, color, glow = 0x000000) {
  const material = new MeshLambertMaterial({ color, emissive: glow });
  return new Mesh(new BoxGeometry(width, height, depth), material);
}

export function placed(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}
