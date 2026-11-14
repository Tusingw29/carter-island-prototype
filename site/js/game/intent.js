// Turns raw keyboard and controller state into one plain "intent" object.
// The game logic only ever sees intents, so it does not care where input came from.
import { CONFIG } from './config.js';

export function emptyIntent() {
  return { moveX: 0, up: false, crouch: false, run: false, debug: false };
}

// codes is a Set of KeyboardEvent.code values that are currently held down.
export function intentFromKeys(codes) {
  const left = codes.has('KeyA') || codes.has('ArrowLeft');
  const right = codes.has('KeyD') || codes.has('ArrowRight');
  return {
    moveX: (right ? 1 : 0) - (left ? 1 : 0),
    up: codes.has('KeyW') || codes.has('ArrowUp'),
    crouch: codes.has('KeyS') || codes.has('ArrowDown'),
    run: codes.has('ShiftLeft') || codes.has('ShiftRight'),
    debug: codes.has('F1') || codes.has('Backquote'),
  };
}

function pressed(pad, index) {
  return Boolean(pad.buttons[index]?.pressed);
}

// pad follows the browser Gamepad API "standard" mapping.
export function intentFromGamepad(pad, cfg = CONFIG.stick) {
  if (!pad) return emptyIntent();
  const stickX = pad.axes[0] ?? 0;
  const stickY = pad.axes[1] ?? 0;
  const stickMove = Math.abs(stickX) > cfg.moveDeadzone ? Math.sign(stickX) : 0;
  const padMove = (pressed(pad, 15) ? 1 : 0) - (pressed(pad, 14) ? 1 : 0);
  return {
    // Movement is all-or-nothing on purpose. It keeps the feel tight, like a D-pad.
    moveX: padMove || stickMove,
    up: pressed(pad, 12) || stickY < -cfg.upDownThreshold,
    crouch: pressed(pad, 13) || stickY > cfg.upDownThreshold,
    run: (pad.buttons[7]?.value ?? 0) > cfg.triggerThreshold,
    debug: pressed(pad, 11),
  };
}

export function mergeIntents(a, b) {
  return {
    moveX: Math.max(-1, Math.min(1, a.moveX + b.moveX)),
    up: a.up || b.up,
    crouch: a.crouch || b.crouch,
    run: a.run || b.run,
    debug: a.debug || b.debug,
  };
}
