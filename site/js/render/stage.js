// The Three.js renderer, scene, camera, and the dim "lights out" lighting.
// Kept cheap on purpose so it runs on old laptops with built-in graphics: no shadows, no
// post-processing, and the picture is drawn at a lower resolution if the frame rate drops.
// It goes back up when the frames are fast again (see quality.js).
import { AmbientLight, Color, PerspectiveCamera, Scene, WebGLRenderer } from '../../vendor/three.module.js';
import { CONFIG } from '../game/config.js';
import { farness } from '../game/framing.js';
import { createQuality, qualityShare, watchQuality } from '../quality.js';

// Camera height and where it looks, at the close distance. Both scale as it pulls back, so the
// downward tilt stays the same and the room sits in the middle of the picture.
const CAMERA_RISE = 1.1;
const LOOK_HEIGHT = 1.7;
const LOOK_HEIGHT_FAR = 2.05;

export function createStage(canvas, startLow = false) {
  const sharpScreen = window.devicePixelRatio > 1;
  // Smoothing edges is costly on a high-density screen and barely visible there.
  const renderer = new WebGLRenderer({ canvas, antialias: !sharpScreen, powerPreference: 'high-performance' });
  const basePixelRatio = Math.min(window.devicePixelRatio, 1.5);
  // ?low asks for the lowest step and keeps it there.
  const quality = createQuality(startLow);
  let averageMs = 16;

  const scene = new Scene();
  scene.background = new Color(0x05070b);
  scene.add(new AmbientLight(0x8ea4d0, 1.7));

  const camera = new PerspectiveCamera(CONFIG.view.fovDeg, 1, 0.1, 200);

  function resize() {
    renderer.setPixelRatio(basePixelRatio * qualityShare(quality));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Call once per frame with how long the frame took.
  function watchSpeed(frameMs) {
    averageMs += (frameMs - averageMs) * 0.05;
    if (watchQuality(quality, frameMs)) resize();
  }

  // Puts the camera where the framing says: framing.x along the room, framing.distance back.
  // shake moves the whole picture by { x, y } metres, for a hit landing.
  function frame(framing, shake = { x: 0, y: 0 }) {
    const lookHeight = LOOK_HEIGHT + (LOOK_HEIGHT_FAR - LOOK_HEIGHT) * farness(framing) + shake.y;
    const rise = (CAMERA_RISE * framing.distance) / CONFIG.view.closeDistance;
    camera.position.set(framing.x + shake.x, lookHeight + rise, framing.distance);
    camera.lookAt(framing.x + shake.x, lookHeight, 0);
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
    speedReport: () => `${Math.round(1000 / averageMs)} fps, picture at ${qualityShare(quality) * 100}%`,
  };
}
