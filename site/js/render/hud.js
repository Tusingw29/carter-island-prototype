// Fixed on-screen readouts: timer, alert meter, keycard, room name, mash bar, debug panel.
import { CONFIG } from '../game/config.js';
import { alertSummary } from '../game/alert.js';
import { formatClock } from '../game/clock.js';
import { currentAnnouncement } from '../game/cues.js';
import { currentMessage } from '../game/messages.js';
import { peek } from '../game/vents.js';
import { setHidden, setText, setWidth } from './dom.js';

const LABELS = { calm: 'CALM', suspicious: 'SUSPICIOUS', searching: 'SEARCHING', alert: 'ALERT' };

function debugText(world, build, speed) {
  const { player } = world;
  const lines = [
    `DEBUG  build ${build}   [ and ] change the timer by 30 s`,
    `speed    ${speed}`,
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

const BED_CHECK_RESULTS = {
  'in-bed': 'bed check passed', dummy: 'bed check passed (dummy)', empty: 'BED FOUND EMPTY', skipped: 'no bed check',
};

function bedCheckText(world) {
  if (!world.bedCheck) return `bed check at ${formatClock(CONFIG.bedCheckAtSecondsRemaining)}`;
  if (!world.bedCheck.result) return 'BED CHECK NOW';
  return BED_CHECK_RESULTS[world.bedCheck.result];
}

// cues: false hides the PA announcements and stops the timer pulsing.
export function createHud(build, cues = true) {
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
  const badges = [
    ['hasScrewdriver', byId('screwdriver')],
    ['hasCigarettes', byId('cigarettes')],
    ['hasBedsheets', byId('bedsheets')],
  ];
  const bedCheck = byId('bed-check');
  const message = byId('message');
  const pa = byId('pa');
  const silentAlarm = byId('silent-alarm');
  const peekPanel = byId('peek');
  const peekTitle = byId('peek-title');
  const peekStrip = byId('peek-strip');
  let shownRoom = null;
  let lastPeek = '';

  // Looking down through a grate: a strip showing the room below, with its guards and cameras.
  function updatePeek(view) {
    setHidden(peekPanel, !view);
    if (!view) return;
    const at = (x) => `${(x / view.width) * 100}%`;
    const wide = (halfWidth) => `${((halfWidth * 2) / view.width) * 100}%`;
    setText(peekTitle, `Looking down into the ${view.name}`);
    const html = [
      ...view.spots.map((s) => `<i class="spot ${s.type}" style="left:${at(s.x)};width:${wide(s.halfWidth)}"></i>`),
      ...view.cameras.map((c) => `<i class="cam" style="left:${at(c.x)};width:${wide(c.halfWidth)}"></i>`),
      ...view.guards.map((g) => {
        const arrow = g.facing > 0 ? '&#9654;' : '&#9664;';
        return `<b class="${g.state}" style="left:${at(g.x)}">${g.state === 'asleep' ? 'z' : arrow}</b>`;
      }),
    ].join('');
    if (html !== lastPeek) {
      lastPeek = html;
      peekStrip.innerHTML = html;
    }
  }

  function update(world, debug, speed) {
    setText(timer, formatClock(world.timeLeft));
    timer.classList.toggle('low', world.timeLeft <= CONFIG.timerWarningSeconds);
    // In the last minute the timer pulses, and it flashes while the PA is talking.
    const announcement = cues ? currentAnnouncement(world) : null;
    timer.classList.toggle('pulse', cues && world.timeLeft <= CONFIG.timerWarningSeconds && !world.over);
    timer.classList.toggle('called', Boolean(announcement));
    setHidden(pa, !announcement);
    if (announcement) setText(pa, announcement);
    setHidden(keycard, !world.player.hasKeycard);
    setHidden(silentAlarm, !world.silentAlarm);
    for (const [flag, badge] of badges) setHidden(badge, !world.player[flag]);
    setText(bedCheck, bedCheckText(world));

    const text = currentMessage(world);
    setHidden(message, !text);
    if (text) setText(message, text);
    updatePeek(peek(world));

    // The room name fades in each time you enter a room.
    if (shownRoom !== world.room.id) {
      shownRoom = world.room.id;
      roomName.textContent = world.room.name;
      roomName.classList.remove('show');
      requestAnimationFrame(() => roomName.classList.add('show'));
    }

    const summary = alertSummary(world);
    if (meter.dataset.state !== summary.level) meter.dataset.state = summary.level;
    setText(meterLabel, LABELS[summary.level]);
    setWidth(meterFill, summary.fill * 100);

    setHidden(mash, !world.grab);
    if (world.grab) setWidth(mashFill, (world.grab.presses / CONFIG.grab.mashNeeded) * 100);

    document.body.classList.toggle('debug', debug);
    if (debug) setText(panel, debugText(world, build, speed));
  }
  return { update };
}
