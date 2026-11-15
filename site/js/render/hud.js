// Fixed on-screen readouts: timer, alert meter, keycard, room name, mash bar, debug panel.
import { CONFIG } from '../game/config.js';
import { alertSummary } from '../game/alert.js';
import { formatClock } from '../game/clock.js';
import { currentAnnouncement } from '../game/cues.js';
import { currentMessage } from '../game/messages.js';
import { shoveCharge } from '../game/shove.js';
import { holdLeft, holdOptions } from '../game/takedown.js';
import { throwableName } from '../game/throwing.js';
import { peek } from '../game/vents.js';
import { setHidden, setText, setWidth } from './dom.js';

const LABELS = { calm: 'CALM', suspicious: 'SUSPICIOUS', searching: 'SEARCHING', alert: 'ALERT' };

function debugText(world, build, speed) {
  const { player } = world;
  const lines = [
    `DEBUG  build ${build}   [ and ] change the timer by 30 s`,
    `speed    ${speed}`,
    `room     ${world.room.name}`,
    `player   ${player.mode}  ${player.speed.toFixed(1)} m/s  x ${player.x.toFixed(1)}  y ${player.y.toFixed(1)}`,
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
// The gym course clock, in seconds and tenths.
function courseClock(world) {
  const seconds = world.course?.seconds;
  return seconds == null ? '0.0 s' : `${seconds.toFixed(1)} s`;
}

function courseNote(world, best) {
  const done = world.course?.finishedAt != null;
  return `${done ? 'FINISHED' : 'course time'}${best == null ? '' : `   best ${best.toFixed(2)} s`}`;
}

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
    ['hasBoots', byId('boots')],
  ];
  const bedCheck = byId('bed-check');
  const message = byId('message');
  const pa = byId('pa');
  const silentAlarm = byId('silent-alarm');
  const carrying = byId('carrying');
  const shoveMeter = byId('shove');
  const shoveFill = byId('shove-fill');
  const peekPanel = byId('peek');
  const peekTitle = byId('peek-title');
  const peekStrip = byId('peek-strip');
  const takedown = byId('takedown');
  const takedownList = byId('takedown-options');
  const takedownFill = byId('takedown-fill');
  let shownOptions = '';
  let shownRoom = null;

  // The choices while you hold a guard, with the buttons, and the time left before he breaks free.
  function updateTakedown(world) {
    const options = holdOptions(world);
    setHidden(takedown, options.length === 0);
    if (options.length === 0) return;
    setWidth(takedownFill, holdLeft(world) * 100);
    const html = options.map((option) => {
      const bar = option.progress == null ? ''
        : `<span class="bar"><span style="width:${Math.round(option.progress * 100)}%"></span></span>`;
      return `<li><b>${option.keys}</b><i>${option.pad}</i><span>${option.label}</span>${bar}</li>`;
    }).join('');
    if (html !== shownOptions) {
      shownOptions = html;
      takedownList.innerHTML = html;
    }
  }
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

  // best is the fastest gym course time this session, or null.
  function update(world, debug, speed, best = null) {
    setText(timer, world.layout.practice ? courseClock(world) : formatClock(world.timeLeft));
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
    const held = world.player.carrying;
    setHidden(carrying, !held);
    if (held) setText(carrying, `${throwableName(held).toUpperCase()}  (hold F: aim, let go: throw)`);
    // The shove meter: full means ready.
    const charge = shoveCharge(world);
    setWidth(shoveFill, charge * 100);
    shoveMeter.classList.toggle('ready', charge >= 1);
    setText(bedCheck, world.layout.practice ? courseNote(world, best) : bedCheckText(world));

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

    updateTakedown(world);
    setHidden(mash, !world.grab);
    if (world.grab) setWidth(mashFill, (world.grab.presses / CONFIG.grab.mashNeeded) * 100);

    document.body.classList.toggle('debug', debug);
    if (debug) setText(panel, debugText(world, build, speed));
  }
  return { update };
}
