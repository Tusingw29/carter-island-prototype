// The Three.js renderer, scene, camera, and the dim "lights out" lighting.
// Kept cheap on purpose so it runs on old laptops with built-in graphics: no shadows, no
// post-processing, and the picture is drawn at a lower resolution if the frame rate drops.
import { AmbientLight, Color, PerspectiveCamera, Scene, WebGLRenderer } from '../../vendor/three.module.js';

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 2.8;
const LOOK_HEIGHT = 1.7;
const FOLLOW_SHARPNESS = 10;
// Resolution steps, as a share of the screen's own pixels. Lower is faster and blurrier.
const QUALITY_STEPS = [1, 0.75, 0.55];
const SLOW_FRAME_MS = 24;
const FRAMES_TO_JUDGE = 120;

export function createStage(canvas, startLow = false) {
  const sharpScreen = window.devicePixelRatio > 1;
  // Smoothing edges is costly on a high-density screen and barely visible there.
  const renderer = new WebGLRenderer({ canvas, antialias: !sharpScreen, powerPreference: 'high-performance' });
  const basePixelRatio = Math.min(window.devicePixelRatio, 1.5);
  let quality = startLow ? QUALITY_STEPS.length - 1 : 0;
  let slowFrames = 0;
  let averageMs = 16;

  const scene = new Scene();
  scene.background = new Color(0x05070b);
  scene.add(new AmbientLight(0x8ea4d0, 1.7));

  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);

  function resize() {
    renderer.setPixelRatio(basePixelRatio * QUALITY_STEPS[quality]);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Call once per frame with how long the frame took. Drops the resolution a step after two
  // seconds of slow frames. It never goes back up by itself, so the picture does not flicker.
  function watchSpeed(frameMs) {
    averageMs += (frameMs - averageMs) * 0.05;
    slowFrames = frameMs > SLOW_FRAME_MS ? slowFrames + 1 : 0;
    if (slowFrames < FRAMES_TO_JUDGE || quality >= QUALITY_STEPS.length - 1) return;
    quality += 1;
    slowFrames = 0;
    resize();
  }

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

  return {
    renderer,
    scene,
    camera,
    follow,
    watchSpeed,
    render: () => renderer.render(scene, camera),
    // For the debug panel.
    speedReport: () => `${Math.round(1000 / averageMs)} fps, picture at ${QUALITY_STEPS[quality] * 100}%`,
  };
}
