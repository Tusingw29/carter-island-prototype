// HTML pinned to things in the 3D view: guard icons, the action hint, and the hold bar.
import { Vector3 } from '../../vendor/three.module.js';
import { shownState } from '../game/alert.js';
import { holdProgress } from '../game/holds.js';
import { currentPrompt } from '../game/prompts.js';
import { moveTo, setHidden, setText, setWidth } from './dom.js';

const ICONS = { calm: '', suspicious: '?', searching: '?', alert: '!', out: 'z', asleep: 'Zz' };
const LABELS = { calm: 'CALM', suspicious: 'SUSPICIOUS', searching: 'SEARCHING', alert: 'ALERT', asleep: 'ASLEEP' };
const point = new Vector3();

function pin(element, camera, x, y) {
  point.set(x, y, 0).project(camera);
  moveTo(element, (point.x * 0.5 + 0.5) * window.innerWidth, (-point.y * 0.5 + 0.5) * window.innerHeight);
}

function iconText(guard, debug) {
  if (guard.hiddenIn) return '';
  if (guard.duty && guard.state === 'calm') return 'BED CHECK';
  if (guard.state === 'asleep' && guard.stirTimer > 0) return `Zz? ${Math.ceil(guard.stirTimer)}`;
  const state = shownState(guard);
  return ICONS[state] + (debug && LABELS[state] ? ` ${LABELS[state]}` : '');
}

export function createOverlay() {
  const prompt = document.getElementById('prompt');
  const promptText = document.getElementById('prompt-text');
  const holdFill = document.getElementById('hold-fill');
  const icons = [];

  function iconFor(index) {
    if (!icons[index]) {
      icons[index] = document.createElement('div');
      icons[index].className = 'guard-icon';
      document.body.append(icons[index]);
    }
    return icons[index];
  }

  function update(world, camera, debug) {
    const hint = currentPrompt(world);
    const progress = holdProgress(world);
    setHidden(prompt, !hint);
    if (hint) {
      setText(promptText, hint.text);
      setHidden(holdFill.parentElement, progress === null);
      setWidth(holdFill, (progress ?? 0) * 100);
      pin(prompt, camera, hint.x, hint.y);
    }

    world.guards.forEach((guard, index) => {
      const icon = iconFor(index);
      setText(icon, iconText(guard, debug));
      if (icon.dataset.state !== shownState(guard)) icon.dataset.state = shownState(guard);
      pin(icon, camera, guard.x, guard.state === 'out' ? 1.1 : 2.5);
    });
    icons.slice(world.guards.length).forEach((icon) => setText(icon, ''));
  }
  return { update };
}
