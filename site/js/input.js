// Browser side of input: listens to the keyboard, polls the controller, returns one intent.
import { intentFromGamepad, intentFromKeys, mergeIntents } from './game/intent.js';

const GAME_KEYS = new RegExp([
  '^(Key[WASDEMC]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space|Enter|Escape',
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

  return {
    read: () => mergeIntents(intentFromKeys(held), intentFromGamepad(firstGamepad())),
  };
}
