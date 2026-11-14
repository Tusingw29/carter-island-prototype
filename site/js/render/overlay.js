// HTML pinned to things in the 3D view: guard icons, the action hint, and the hold bar.
import { Vector3 } from '../../vendor/three.module.js';
import { shownState } from '../game/alert.js';
import { CONFIG } from '../game/config.js';
import { holdProgress } from '../game/holds.js';
import { wakeProgress } from '../game/knockout.js';
import { onRadioNow } from '../game/radio.js';
import { currentPrompt } from '../game/prompts.js';
import { moveTo, setHidden, setText, setWidth } from './dom.js';

const ICONS = { calm: '', suspicious: '?', searching: '?', alert: '!', out: 'Zz', asleep: 'Zz' };
const RADIO = '((\u2022))';
const DUTIES = { bedCheck: 'BED CHECK', radio: 'RADIO CHECK' };
const LABELS = { calm: 'CALM', suspicious: 'SUSPICIOUS', searching: 'SEARCHING', alert: 'ALERT', asleep: 'ASLEEP' };
const point = new Vector3();

function pin(element, camera, x, y) {
  point.set(x, y, 0).project(camera);
  moveTo(element, (point.x * 0.5 + 0.5) * window.innerWidth, (-point.y * 0.5 + 0.5) * window.innerHeight);
}

// Debug only: how close a knocked-out guard is to waking, as a ten-step meter and seconds left.
function wakeMeter(guard) {
  const progress = wakeProgress(guard);
  const total = CONFIG.knockout.wakeSeconds + (guard.hiddenIn ? CONFIG.knockout.bangSeconds : 0);
  const steps = Math.round(progress * 10);
  return ` wakes [${'#'.repeat(steps)}${'-'.repeat(10 - steps)}] ${Math.ceil(total * (1 - progress))}s`;
}

function iconText(guard, debug, world) {
  if (guard.state === 'out') {
    const banging = guard.hiddenIn && guard.outFor >= CONFIG.knockout.wakeSeconds;
    const base = guard.hiddenIn ? (banging ? 'BANG! BANG!' : '') : (guard.wakeWarned ? 'Zz...?' : 'Zz');
    return base + (debug ? wakeMeter(guard) : '');
  }
  if (guard.held) return '!?';
  if (onRadioNow(guard, world)) return `${RADIO} check-in`;
  if (guard.duty && guard.state === 'calm') return DUTIES[guard.duty.type] ?? '';
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
      setText(icon, iconText(guard, debug, world));
      if (icon.dataset.state !== shownState(guard)) icon.dataset.state = shownState(guard);
      pin(icon, camera, guard.x, guard.state === 'out' && !guard.hiddenIn ? 1.1 : 2.5);
    });
    icons.slice(world.guards.length).forEach((icon) => setText(icon, ''));
  }
  return { update };
}
