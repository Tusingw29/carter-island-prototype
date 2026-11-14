// Live tuning for the gym: sliders that stand for movement numbers in config.js.
// The sliders are in terms a player can feel (how high, how far). This file turns them into the
// numbers the game uses, and back, and writes them out ready to paste into config.js.
import { CONFIG } from './config.js';

export const SLIDERS = Object.freeze([
  { id: 'jumpHeight', label: 'Jump height', unit: 'm', min: 0.6, max: 3, step: 0.05 },
  { id: 'gravity', label: 'Gravity (going up)', unit: 'm/s2', min: 10, max: 90, step: 1 },
  { id: 'fallGravity', label: 'Fall speed (gravity coming down)', unit: 'm/s2', min: 10, max: 140, step: 1 },
  { id: 'dashSpeed', label: 'Dash speed', unit: 'm/s', min: 6, max: 26, step: 0.5 },
  { id: 'dashDistance', label: 'Dash distance', unit: 'm', min: 1, max: 9, step: 0.1 },
]);

const round = (value, places = 3) => Number(value.toFixed(places));

// The slider positions that match a set of movement numbers.
export function slidersFromMoves(moves = CONFIG.moves) {
  return {
    jumpHeight: round((moves.jumpSpeed ** 2) / (2 * moves.gravity), 2),
    gravity: moves.gravity,
    fallGravity: moves.fallGravity,
    dashSpeed: moves.dashSpeed,
    dashDistance: round(moves.dashSpeed * moves.dashSeconds, 2),
  };
}

// The movement numbers for a set of slider positions. Everything without a slider comes from base.
export function movesFromSliders(values, base = CONFIG.moves) {
  return {
    ...base,
    gravity: values.gravity,
    fallGravity: values.fallGravity,
    // Jump height stays what the slider says, whatever gravity is.
    jumpSpeed: round(Math.sqrt(2 * values.gravity * values.jumpHeight)),
    dashSpeed: values.dashSpeed,
    dashSeconds: round(values.dashDistance / values.dashSpeed),
  };
}

// Text to paste into the moves section of config.js.
export function tuningText(moves) {
  const keys = ['jumpSpeed', 'gravity', 'fallGravity', 'dashSpeed', 'dashSeconds'];
  const sliders = slidersFromMoves(moves);
  return [
    `// Jump height ${sliders.jumpHeight} m, dash distance ${sliders.dashDistance} m.`,
    ...keys.map((key) => `${key}: ${moves[key]},`),
  ].join('\n');
}
