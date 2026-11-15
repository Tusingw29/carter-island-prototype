// Browser side of input: listens to the keyboard, polls the controller, returns one intent.
import { intentFromGamepad, intentFromKeys, mergeIntents } from './game/intent.js';

const GAME_KEYS = new RegExp([
  '^(Key[WASDEMCZKLFQR]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space|Enter|Escape',
  '|F1|Backquote|Bracket(Left|Right))$',
].join(''));

export function createInput() {
  const held = new Set();

  // Typing in the playtest form must not move the player or be swallowed by the game.
  const typing = (event) => event.target instanceof HTMLElement && event.target.closest('textarea, input');

  window.addEventListener('keydown', (event) => {
    if (typing(event)) {
      held.clear();
      return;
    }
    if (!GAME_KEYS.test(event.code)) return;
    event.preventDefault();
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  // Losing focus must not leave a key stuck down.
  window.addEventListener('blur', () => held.clear());

  function firstGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) if (pad && pad.connected) return pad;
    return null;
  }

  // A short buzz on the controller, where the browser and the controller support it.
  function rumble(seconds, strength) {
    try {
      firstGamepad()?.vibrationActuator?.playEffect?.('dual-rumble', {
        duration: seconds * 1000, strongMagnitude: strength, weakMagnitude: strength * 0.6,
      })?.catch?.(() => {});
    } catch {
      // No rumble on this controller. Nothing to do.
    }
  }

  return {
    rumble,
    read: () => mergeIntents(intentFromKeys(held), intentFromGamepad(firstGamepad())),
  };
}
