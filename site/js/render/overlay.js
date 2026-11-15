// HTML pinned to things in the 3D view: guard icons, the action hint, and the hold bar.
import { Vector3 } from '../../vendor/three.module.js';
import { shownState } from '../game/alert.js';
import { CONFIG } from '../game/config.js';
import { awarenessMeters } from '../game/awareness.js';
import { edgePlacement, meterMarker } from '../game/edge.js';
import { isDoorway, lockLeft } from '../game/heat.js';
import { portalX } from '../game/portals.js';
import { holdProgress } from '../game/holds.js';
import { lastSeenMarkers } from '../game/lastseen.js';
import { ledgeFor, shoveReady, shoveTarget, staggerLeft } from '../game/shove.js';
import { dropTarget, heldGuard, holdInfo, holdLeft, holdOptions } from '../game/takedown.js';
import { wakeProgress } from '../game/knockout.js';
import { onRadioNow } from '../game/radio.js';
import { currentPrompt } from '../game/prompts.js';
import { moveTo, setHidden, setText, setWidth } from './dom.js';

const ICONS = { calm: '', suspicious: '?', searching: '?', alert: '!', out: 'Zz', asleep: 'Zz', held: '' };
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
  if (guard.state === 'alert' && guard.lunge > 0) return '!!';
  if (guard.stun > 0) return '~';
  if (guard.vault) return 'hup';
  if (guard.glance > 0) return '...?';
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
  const ears = [];

  // The hearing meter: a small arc over a guard that fills as he hears you.
  function earFor(index) {
    if (!ears[index]) {
      ears[index] = document.createElement('div');
      ears[index].className = 'hear-arc';
      document.body.append(ears[index]);
    }
    return ears[index];
  }

  function iconFor(index) {
    if (!icons[index]) {
      icons[index] = document.createElement('div');
      icons[index].className = 'guard-icon';
      document.body.append(icons[index]);
    }
    return icons[index];
  }

  // ---------- Awareness meters ----------
  const eyes = new Map();
  const ARROWS = { left: '\u25C0', right: '\u25B6', up: '\u25B2', down: '\u25BC' };

  function eyeFor(id) {
    if (!eyes.has(id)) {
      const eye = document.createElement('div');
      eye.className = 'eye';
      document.body.append(eye);
      eyes.set(id, eye);
    }
    return eyes.get(id);
  }

  // One eye per thing that is noticing you, right over it, filling as its meter fills. If it
  // is off screen the eye sits at the edge of the screen as an arrow pointing to it.
  function updateEyes(world, camera) {
    const meters = awarenessMeters(world);
    for (const meter of meters) {
      const eye = eyeFor(meter.id);
      point.set(meter.x, meter.y, 0).project(camera);
      const x = (point.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-point.y * 0.5 + 0.5) * window.innerHeight;
      const placement = edgePlacement(x, y, window.innerWidth, window.innerHeight);
      // On screen, a guard whose meter is full already has his big "!" over him: no second
      // icon. Off screen he keeps a red arrow at the edge for as long as he is hunting you.
      const marker = meterMarker(meter, placement);
      setHidden(eye, marker.hidden);
      if (marker.hidden) continue;
      moveTo(eye, placement.left, Math.max(placement.top, 40));
      setText(eye, marker.arrow ? ARROWS[marker.arrow] : (meter.full ? '!' : ''));
      const fill = Math.round(meter.fill * 24) / 24;
      if (eye.dataset.fill !== String(fill)) {
        eye.dataset.fill = String(fill);
        eye.style.setProperty('--fill', fill);
      }
      if (eye.dataset.state !== marker.state) eye.dataset.state = marker.state;
    }
    for (const [id, eye] of eyes) if (!meters.some((meter) => meter.id === id)) setHidden(eye, true);
  }

  // ---------- The takedown pop-up, the speech bubble, and markers ----------
  const takedown = document.getElementById('takedown');
  const takedownList = document.getElementById('takedown-options');
  const takedownFill = document.getElementById('takedown-fill');
  const speech = document.getElementById('speech');
  const dropMark = document.getElementById('drop-mark');
  let shownOptions = '';
  const ghostLabels = [];

  // The four choices and their buttons, next to the guard you are holding.
  function updateTakedown(world, camera) {
    const options = holdOptions(world);
    setHidden(takedown, options.length === 0);
    if (options.length === 0) return;
    const guard = heldGuard(world);
    setWidth(takedownFill, holdLeft(world) * 100);
    const html = options.map((option) => {
      const bar = option.progress == null ? ''
        : `<span class="bar"><span style="width:${Math.round(option.progress * 100)}%"></span></span>`;
      return `<li><b>${option.keys}</b><i>${option.pad}</i><span>${option.label}</span>${bar}</li>`;
      // What is at stake: his next radio check-in and who comes if he misses it.
    }).join('') + holdInfo(world).map((line) => `<li class="info">${line}</li>`).join('');
    if (html !== shownOptions) {
      shownOptions = html;
      takedownList.innerHTML = html;
    }
    // Beside him, clear of both of you and of the message line at the top.
    pin(takedown, camera, guard.x + 3.4, (guard.y ?? 0) + 1.9);
  }

  // What an interrogated guard said, in a bubble over his head.
  function updateSpeech(world, camera) {
    const said = world.speech;
    const guard = said && world.time < said.until ? world.guards.find((entry) => entry.id === said.guardId) : null;
    setHidden(speech, !guard);
    if (!guard) return;
    setText(speech, `\u201C${said.text}\u201D`);
    // Under his feet, hanging down, so it never covers the menu or the two of you.
    point.set(guard.x, (guard.y ?? 0) - 0.15, 0).project(camera);
    const left = Math.round((point.x * 0.5 + 0.5) * window.innerWidth);
    const top = Math.round((-point.y * 0.5 + 0.5) * window.innerHeight);
    speech.style.transform = `translate(${left}px, ${top}px) translate(-50%, 0)`;
  }

  // A marker on the guard you could drop on, and the words "last seen" on the first few ghosts.
  function updateMarkers(world, camera) {
    const below = dropTarget(world);
    setHidden(dropMark, !below);
    if (below) pin(dropMark, camera, below.x, (below.y ?? 0) + 2.3);
    const labelled = lastSeenMarkers(world).filter((marker) => marker.label);
    labelled.forEach((marker, i) => {
      if (!ghostLabels[i]) {
        ghostLabels[i] = document.createElement('div');
        ghostLabels[i].className = 'ghost-label';
        ghostLabels[i].textContent = 'last seen';
        document.body.append(ghostLabels[i]);
      }
      setHidden(ghostLabels[i], false);
      pin(ghostLabels[i], camera, marker.x, marker.y + 2.15);
    });
    ghostLabels.slice(labelled.length).forEach((label) => setHidden(label, true));
  }

  // Lockdown: a tag on every door and hall of the room, counting down.
  const lockTags = [];
  function updateLocks(world, camera) {
    const left = lockLeft(world);
    const doors = left > 0 ? (world.room.portals ?? []).filter(isDoorway) : [];
    doors.forEach((portal, i) => {
      if (!lockTags[i]) {
        lockTags[i] = document.createElement('div');
        lockTags[i].className = 'lock-tag';
        document.body.append(lockTags[i]);
      }
      setHidden(lockTags[i], false);
      setText(lockTags[i], `LOCKED ${Math.ceil(left)}`);
      const x = Math.max(1, Math.min(world.room.width - 1, portalX(world.room, portal)));
      pin(lockTags[i], camera, x, (portal.y ?? 0) + 2.2);
    });
    lockTags.slice(doors.length).forEach((tag) => setHidden(tag, true));
  }

  // A stun bar over a staggering guard: how long until HE can act again. And the edge tell:
  // an arrow over the head of a guard a shove would send off his platform.
  const stunBars = [];
  const ledgeMark = document.getElementById('ledge-mark');
  function updateStagger(world, camera) {
    world.guards.forEach((guard, i) => {
      if (!stunBars[i]) {
        stunBars[i] = document.createElement('div');
        stunBars[i].className = 'stun-bar';
        stunBars[i].append(document.createElement('div'));
        document.body.append(stunBars[i]);
      }
      const left = staggerLeft(guard);
      setHidden(stunBars[i], !left);
      if (!left) return;
      setWidth(stunBars[i].firstChild, left.share * 100);
      pin(stunBars[i], camera, guard.x, (guard.y ?? 0) + 2.15);
    });
    stunBars.slice(world.guards.length).forEach((bar) => setHidden(bar, true));
    const target = shoveReady(world) ? shoveTarget(world) : null;
    const ledge = target ? ledgeFor(world, target) : null;
    setHidden(ledgeMark, !ledge);
    if (!ledge) return;
    setText(ledgeMark, ledge.side > 0 ? '\u2198' : '\u2199');
    pin(ledgeMark, camera, target.x + ledge.side * 0.6, (target.y ?? 0) + 2.45);
  }

  function update(world, camera, debug) {
    updateEyes(world, camera);
    updateStagger(world, camera);
    updateLocks(world, camera);
    updateTakedown(world, camera);
    updateSpeech(world, camera);
    updateMarkers(world, camera);
    const hint = currentPrompt(world);
    const progress = holdProgress(world);
    setHidden(prompt, !hint);
    if (hint) {
      setText(promptText, hint.text);
      setHidden(holdFill.parentElement, progress === null);
      setWidth(holdFill, (progress ?? 0) * 100);
      pin(prompt, camera, hint.x, hint.y);
      prompt.classList.toggle('shake', Boolean(hint.shake));
    }

    world.guards.forEach((guard, index) => {
      const icon = iconFor(index);
      setText(icon, iconText(guard, debug, world));
      if (icon.dataset.state !== shownState(guard)) icon.dataset.state = shownState(guard);
      // The moment of shock when he first goes Alert: a big "!".
      icon.classList.toggle('shock', guard.state === 'alert' && guard.react > 0);
      pin(icon, camera, guard.x, (guard.y ?? 0) + (guard.state === 'out' && !guard.hiddenIn ? 1.1 : 2.5));
    });
    icons.slice(world.guards.length).forEach((icon) => setText(icon, ''));
    world.guards.forEach((guard, index) => {
      const ear = earFor(index);
      const fill = guard.state === 'out' || guard.state === 'held' ? 0 : Math.round((guard.hearing ?? 0) * 20) / 20;
      setHidden(ear, fill <= 0);
      if (fill <= 0) return;
      if (ear.dataset.fill !== String(fill)) {
        ear.dataset.fill = String(fill);
        ear.style.setProperty('--fill', fill);
      }
      pin(ear, camera, guard.x, (guard.y ?? 0) + 2.25);
    });
    ears.slice(world.guards.length).forEach((ear) => setHidden(ear, true));
  }
  return { update };
}
