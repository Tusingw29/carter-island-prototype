// HTML drawn over the 3D view: guard icons, the alert meter, hints, and the debug panel.
import { Vector3 } from '../../vendor/three.module.js';
import { CONFIG } from '../game/config.js';
import { alertSummary } from '../game/alert.js';
import { currentPrompt } from '../game/prompts.js';

const ICONS = { calm: '', suspicious: '?', searching: '?', alert: '!', out: 'z' };
const LABELS = { calm: 'CALM', suspicious: 'SUSPICIOUS', searching: 'SEARCHING', alert: 'ALERT' };
const point = new Vector3();

function pin(element, camera, x, y) {
  point.set(x, y, 0).project(camera);
  element.style.left = `${(point.x * 0.5 + 0.5) * window.innerWidth}px`;
  element.style.top = `${(-point.y * 0.5 + 0.5) * window.innerHeight}px`;
}

function debugText(world, build) {
  const { player } = world;
  const lines = [
    `DEBUG  build ${build}`,
    `player   ${player.mode}  ${player.speed.toFixed(1)} m/s  x ${player.x.toFixed(1)}`,
    `noise    ${world.noiseRadius.toFixed(1)} m`,
    `hidden   ${player.hiddenIn ?? player.inDark ?? 'no'}`,
    `break free used  ${world.breakFreeUsed ? 'yes' : 'no'}`,
    `spotted ${world.stats.timesSpotted}  knockouts ${world.stats.knockouts}  bodies found ${world.stats.bodiesFound}`,
  ];
  for (const guard of world.guards) {
    const meter = `${Math.round(guard.detection * 100)}%`.padStart(4);
    const sees = guard.seesPlayer ? 'Y' : 'n';
    lines.push(`${guard.id}  ${guard.state.padEnd(10)} sees ${sees} ${meter}  x ${guard.x.toFixed(1)}`);
  }
  return lines.join('\n');
}

export function createOverlay(build) {
  const byId = (id) => document.getElementById(id);
  const prompt = byId('prompt');
  const panel = byId('debug-panel');
  const meter = byId('alert-meter');
  const meterLabel = byId('alert-label');
  const meterFill = byId('alert-fill');
  const mash = byId('mash');
  const mashFill = byId('mash-fill');
  const caught = byId('caught');
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
    prompt.hidden = !hint;
    if (hint) {
      prompt.textContent = hint.text;
      pin(prompt, camera, hint.x, hint.y);
    }

    world.guards.forEach((guard, index) => {
      const icon = iconFor(index);
      const label = debug && guard.state !== 'out' ? ` ${LABELS[guard.state]}` : '';
      icon.textContent = guard.hiddenIn ? '' : ICONS[guard.state] + label;
      icon.dataset.state = guard.state;
      pin(icon, camera, guard.x, guard.state === 'out' ? 1.1 : 2.5);
    });
    icons.slice(world.guards.length).forEach((icon) => { icon.textContent = ''; });

    const summary = alertSummary(world);
    meter.dataset.state = summary.level;
    meterLabel.textContent = LABELS[summary.level];
    meterFill.style.width = `${Math.round(summary.fill * 100)}%`;

    mash.hidden = !world.grab;
    if (world.grab) mashFill.style.width = `${(world.grab.presses / CONFIG.grab.mashNeeded) * 100}%`;
    caught.hidden = world.over !== 'caught';

    document.body.classList.toggle('debug', debug);
    if (debug) panel.textContent = debugText(world, build);
  }
  return { update };
}
