// Shows each tutorial hint once. Which ones have been seen is remembered in this browser.
import { nextTutorial } from '../game/tutorial.js';

const STORAGE_KEY = 'carter-island-hints-seen';
const SHOW_SECONDS = 9;

function loadSeen() {
  // Storage can be blocked or empty. The game works either way: the hints just show again.
  try {
    return new Set(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function saveSeen(seen) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // Nothing to do: the hints will simply show again next visit.
  }
}

export function createTutorialBox() {
  const box = document.getElementById('tutorial');
  let seen = loadSeen();
  let timeLeft = 0;

  function update(world, dt) {
    if (timeLeft > 0) {
      timeLeft -= dt;
      box.hidden = timeLeft <= 0;
      return;
    }
    const hint = nextTutorial(world, seen);
    if (!hint) return;
    seen.add(hint.id);
    saveSeen(seen);
    box.textContent = hint.text;
    box.hidden = false;
    timeLeft = SHOW_SECONDS;
  }

  function reset() {
    seen = new Set();
    saveSeen(seen);
    timeLeft = 0;
    box.hidden = true;
  }

  function hide() {
    timeLeft = 0;
    box.hidden = true;
  }
  return { update, reset, hide };
}
