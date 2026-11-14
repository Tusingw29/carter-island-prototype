// The Three.js renderer, scene, camera, and the dim "lights out" lighting.
import { AmbientLight, Color, PerspectiveCamera, Scene, WebGLRenderer } from '../../vendor/three.module.js';

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 2.8;
const LOOK_HEIGHT = 1.7;
const FOLLOW_SHARPNESS = 10;

export function createStage(canvas) {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  scene.background = new Color(0x05070b);
  scene.add(new AmbientLight(0x8ea4d0, 1.7));

  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Keeps the player on screen without showing past the room's end walls.
  function follow(targetX, roomWidth, dt) {
    const halfView = Math.tan((camera.fov * Math.PI) / 360) * CAMERA_DISTANCE * camera.aspect;
    const min = halfView - 1;
    const max = roomWidth - halfView + 1;
    const goal = min > max ? roomWidth / 2 : Math.max(min, Math.min(max, targetX));
    const blend = dt === Infinity ? 1 : 1 - Math.exp(-FOLLOW_SHARPNESS * dt);
    camera.position.x += (goal - camera.position.x) * blend;
    camera.lookAt(camera.position.x, LOOK_HEIGHT, 0);
  }

  return { renderer, scene, camera, follow, render: () => renderer.render(scene, camera) };
}
