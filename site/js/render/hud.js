// Fixed on-screen readouts: timer, alert meter, keycard, room name, mash bar, debug panel.
import { CONFIG } from '../game/config.js';
import { alertSummary } from '../game/alert.js';
import { formatClock } from '../game/clock.js';
import { currentMessage } from '../game/messages.js';
import { peek } from '../game/vents.js';

const LABELS = { calm: 'CALM', suspicious: 'SUSPICIOUS', searching: 'SEARCHING', alert: 'ALERT' };

function debugText(world, build) {
  const { player } = world;
  const lines = [
    `DEBUG  build ${build}   [ and ] change the timer by 30 s`,
    `room     ${world.room.name}`,
    `player   ${player.mode}  ${player.speed.toFixed(1)} m/s  x ${player.x.toFixed(1)}`,
    `noise    ${world.noiseRadius.toFixed(1)} m`,
    `hidden   ${player.hiddenIn ?? player.inDark ?? 'no'}`,
    `break free used ${world.breakFreeUsed ? 'yes' : 'no'}   seen by camera ${world.seenByCamera ? 'yes' : 'no'}`,
    `spotted ${world.stats.timesSpotted}  knockouts ${world.stats.knockouts}  bodies found ${world.stats.bodiesFound}`,
  ];
  for (const guard of world.guards) {
    const meter = `${Math.round(guard.detection * 100)}%`.padStart(4);
    const sees = guard.seesPlayer ? 'Y' : 'n';
    lines.push(`${guard.id.padEnd(11)} ${guard.state.padEnd(10)} sees ${sees} ${meter}  x ${guard.x.toFixed(1)}`);
  }
  return lines.join('\n');
}

export function createHud(build) {
  const byId = (id) => document.getElementById(id);
  const timer = byId('timer');
  const keycard = byId('keycard');
  const roomName = byId('room-name');
  const meter = byId('alert-meter');
  const meterLabel = byId('alert-label');
  const meterFill = byId('alert-fill');
  const mash = byId('mash');
  const mashFill = byId('mash-fill');
  const panel = byId('debug-panel');
  const screwdriver = byId('screwdriver');
  const message = byId('message');
  const peekPanel = byId('peek');
  const peekTitle = byId('peek-title');
  const peekStrip = byId('peek-strip');
  let shownRoom = null;

  // Looking down through a grate: a strip showing the room below, with its guards and cameras.
  function updatePeek(view) {
    peekPanel.hidden = !view;
    if (!view) return;
    const at = (x) => `${(x / view.width) * 100}%`;
    const wide = (halfWidth) => `${((halfWidth * 2) / view.width) * 100}%`;
    peekTitle.textContent = `Looking down into the ${view.name}`;
    peekStrip.innerHTML = [
      ...view.spots.map((s) => `<i class="spot ${s.type}" style="left:${at(s.x)};width:${wide(s.halfWidth)}"></i>`),
      ...view.cameras.map((c) => `<i class="cam" style="left:${at(c.x)};width:${wide(c.halfWidth)}"></i>`),
      ...view.guards.map((g) => {
        const arrow = g.facing > 0 ? '&#9654;' : '&#9664;';
        return `<b class="${g.state}" style="left:${at(g.x)}">${g.state === 'asleep' ? 'z' : arrow}</b>`;
      }),
    ].join('');
  }

  function update(world, debug) {
    timer.textContent = formatClock(world.timeLeft);
    timer.classList.toggle('low', world.timeLeft <= 60);
    keycard.hidden = !world.player.hasKeycard;
    keycard.textContent = world.silentAlarm ? 'KEYCARD  (silent alarm)' : 'KEYCARD';
    screwdriver.hidden = !world.player.hasScrewdriver;

    const text = currentMessage(world);
    message.hidden = !text;
    if (text) message.textContent = text;
    updatePeek(peek(world));

    // The room name fades in each time you enter a room.
    if (shownRoom !== world.room.id) {
      shownRoom = world.room.id;
      roomName.textContent = world.room.name;
      roomName.classList.remove('show');
      requestAnimationFrame(() => roomName.classList.add('show'));
    }

    const summary = alertSummary(world);
    meter.dataset.state = summary.level;
    meterLabel.textContent = LABELS[summary.level];
    meterFill.style.width = `${Math.round(summary.fill * 100)}%`;

    mash.hidden = !world.grab;
    if (world.grab) mashFill.style.width = `${(world.grab.presses / CONFIG.grab.mashNeeded) * 100}%`;

    document.body.classList.toggle('debug', debug);
    if (debug) panel.textContent = debugText(world, build);
  }
  return { update };
}
