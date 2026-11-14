// Browser entry point. For now it only proves the deploy works:
// vendored Three.js loads, game logic loads, and the build stamp is visible.
import { REVISION } from '../vendor/three.module.js';
import { CONFIG } from './game/config.js';
import { formatClock } from './game/clock.js';

const build = document.querySelector('meta[name="build"]')?.content ?? 'dev';
const status = document.getElementById('status');

status.textContent = [
  `build ${build}`,
  `Three.js r${REVISION}`,
  `headcount timer ${formatClock(CONFIG.headcountSeconds)}`,
].join(' | ');
