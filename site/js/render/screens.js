// The menu screens: title, controls, pause, and the playtest form.
// Only one is open at a time. Controls and playtest go back to whichever screen opened them.
import { playtestText } from '../game/playtest.js';

const NAMES = ['title', 'controls', 'pause', 'playtest'];

export function createScreens({ onStart, onResume, onRestart, onQuit, onResetHints, getResult }) {
  const byId = (id) => document.getElementById(id);
  const elements = Object.fromEntries(NAMES.map((name) => [name, byId(`${name}-screen`)]));
  let open = null;
  let cameFrom = null;

  function show(name) {
    open = name;
    for (const [key, element] of Object.entries(elements)) element.hidden = key !== name;
  }

  // Opens controls or playtest on top of the current screen, remembering where to go back to.
  function openOver(name) {
    cameFrom = open;
    show(name);
  }

  function back() {
    show(cameFrom);
    cameFrom = null;
  }

  for (const button of document.querySelectorAll('[data-open]')) {
    button.addEventListener('click', () => openOver(button.dataset.open));
  }
  for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', back);
  byId('start').addEventListener('click', onStart);
  byId('resume').addEventListener('click', onResume);
  byId('restart').addEventListener('click', onRestart);
  byId('quit').addEventListener('click', onQuit);
  byId('reset-hints').addEventListener('click', () => {
    onResetHints();
    byId('reset-hints').textContent = 'Hints will show again';
  });

  // The playtest form has no server behind it. It builds a block of text for the player to send.
  byId('copy-answers').addEventListener('click', async () => {
    const boxes = [...byId('playtest-form').querySelectorAll('textarea')];
    const answers = boxes.filter((box) => !('extra' in box.dataset)).map((box) => box.value);
    const extra = boxes.find((box) => 'extra' in box.dataset).value;
    const text = playtestText(getResult(), answers, extra);
    const status = byId('copy-status');
    const fallback = byId('copy-fallback');
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied. Paste it into a message to Adam. Thank you!';
      fallback.hidden = true;
    } catch {
      // Some browsers block copying. Show the text so it can be selected by hand.
      fallback.hidden = false;
      fallback.value = text;
      fallback.select();
      status.textContent = 'Select the text below, copy it, and paste it into a message to Adam.';
    }
  });

  return {
    show,
    openOver,
    back,
    get open() { return open; },
    // True while a screen that was opened on top of another is showing.
    get isOverlay() { return open === 'controls' || open === 'playtest'; },
  };
}
