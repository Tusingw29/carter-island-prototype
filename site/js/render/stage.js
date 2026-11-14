// The Three.js renderer, scene, camera, and the dim "lights out" lighting.
// Kept cheap on purpose so it runs on old laptops with built-in graphics: no shadows, no
// post-processing, and the picture is drawn at a lower resolution if the frame rate drops.
import { AmbientLight, Color, PerspectiveCamera, Scene, WebGLRenderer } from '../../vendor/three.module.js';
import { CONFIG } from '../game/config.js';
import { farness } from '../game/framing.js';

// Camera height and where it looks, at the close distance. Both scale as it pulls back, so the
// downward tilt stays the same and the room sits in the middle of the picture.
const CAMERA_RISE = 1.1;
const LOOK_HEIGHT = 1.7;
const LOOK_HEIGHT_FAR = 2.05;
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

  const camera = new PerspectiveCamera(CONFIG.view.fovDeg, 1, 0.1, 200);

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

  // Puts the camera where the framing says: framing.x along the room, framing.distance back.
  function frame(framing) {
    const lookHeight = LOOK_HEIGHT + (LOOK_HEIGHT_FAR - LOOK_HEIGHT) * farness(framing);
    const rise = (CAMERA_RISE * framing.distance) / CONFIG.view.closeDistance;
    camera.position.set(framing.x, lookHeight + rise, framing.distance);
    camera.lookAt(framing.x, lookHeight, 0);
  }

  return {
    renderer,
    scene,
    camera,
    frame,
    aspect: () => camera.aspect,
    watchSpeed,
    render: () => renderer.render(scene, camera),
    // For the debug panel.
    speedReport: () => `${Math.round(1000 / averageMs)} fps, picture at ${QUALITY_STEPS[quality] * 100}%`,
  };
}
