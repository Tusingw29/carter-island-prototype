// Step 7 (playtest 1): camera modes, the PA and other timer cues, and the silent alarm made clear.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../site/js/game/config.js';
import {
  announcements, currentAnnouncement, tickInterval, wallClockXs,
} from '../site/js/game/cues.js';
import {
  CAMERA_MODES, createFraming, framingLabel, halfView, parseCameraMode, toggleZoom, updateFraming,
  visibleSpan, wantsTight,
} from '../site/js/game/framing.js';
import { intentFromGamepad, intentFromKeys } from '../site/js/game/intent.js';
import { silentAlarmReason } from '../site/js/game/keycard.js';
import { playtestText } from '../site/js/game/playtest.js';
import { travel } from '../site/js/game/portals.js';
import { PRISON } from '../site/js/game/rooms.js';
import { jumpTimer } from '../site/js/game/run.js';
import { createWorld } from '../site/js/game/world.js';
import { eventTypes, guardById, prisonWorld, run, tap, knock } from './helpers.mjs';

const VIEW = CONFIG.view;
const FRAME = 1 / 60;
const ASPECTS = [1, 4 / 3, 16 / 10, 16 / 9, 21 / 9];
const ROOM_IDS = Object.keys(PRISON.rooms);

// Runs the camera for some seconds with the player standing where they are.
function settle(framing, world, aspect, seconds = 4) {
  for (let i = 0; i < seconds / FRAME; i += 1) updateFraming(framing, world, aspect, FRAME);
}

// ---------- Camera ----------

test('camera: ?cam= accepts the four modes and anything else means smart, the default', () => {
  assert.deepEqual([...CAMERA_MODES], ['close', 'wide', 'room', 'smart']);
  for (const mode of CAMERA_MODES) assert.equal(parseCameraMode(mode), mode);
  assert.equal(parseCameraMode(null), 'smart');
  assert.equal(parseCameraMode('sideways'), 'smart');
  assert.equal(createFraming().mode, 'smart');
});

test('camera: close is the camera from before, and wide shows twice as much floor', () => {
  const world = prisonWorld('mess-hall', 19);
  const close = updateFraming(createFraming('close'), world, 16 / 9, Infinity);
  const wide = updateFraming(createFraming('wide'), world, 16 / 9, Infinity);
  assert.equal(close.distance, 15);
  assert.equal(close.x, 19);
  const width = ([left, right]) => right - left;
  assert.ok(Math.abs(width(visibleSpan(wide, 16 / 9)) / width(visibleSpan(close, 16 / 9)) - 2) < 1e-9);
  // Close still stops a metre past the end of the room, as it always has.
  world.player.x = 0.5;
  updateFraming(close, world, 16 / 9, Infinity);
  assert.ok(Math.abs(visibleSpan(close, 16 / 9)[0] - -VIEW.followPastWall) < 1e-9);
});

test('camera: room mode never shows past the walls, in any room, at any screen shape or zoom', () => {
  const wall = VIEW.wallThickness + 1e-6;
  for (const roomId of ROOM_IDS) {
    for (const aspect of ASPECTS) {
      for (const zoom of ['wide', 'close']) {
        const world = prisonWorld(roomId, 0.5);
        const { width } = world.room;
        const framing = createFraming('room');
        framing.zoom = zoom;
        updateFraming(framing, world, aspect, Infinity);
        // Walk the whole room, one frame at a time, and check every frame.
        for (let x = 0.5; x <= width - 0.5; x += CONFIG.player.runSpeed * FRAME) {
          world.player.x = x;
          updateFraming(framing, world, aspect, FRAME);
          const [left, right] = visibleSpan(framing, aspect);
          assert.ok(left >= -wall && right <= width + wall, `${roomId} ${aspect} ${zoom} at x ${x}`);
        }
      }
    }
  }
});

test('camera: room mode shows a room whole if it fits, and follows the player if it does not', () => {
  const aspect = 16 / 9;
  const wall = VIEW.wallThickness;
  const stairwell = prisonWorld('stairwell', 3);
  const fitted = updateFraming(createFraming('room'), stairwell, aspect, Infinity);
  const [left, right] = visibleSpan(fitted, aspect);
  assert.ok(Math.abs(left - -wall) < 1e-6 && Math.abs(right - (stairwell.room.width + wall)) < 1e-6);
  stairwell.player.x = 22;
  settle(fitted, stairwell, aspect, 1);
  assert.equal(fitted.x, stairwell.room.width / 2, 'the picture does not move when the player does');

  const messHall = prisonWorld('mess-hall', 19);
  const following = updateFraming(createFraming('room'), messHall, aspect, Infinity);
  assert.equal(following.distance, VIEW.wideDistance);
  assert.equal(following.x, 19);
  messHall.player.x = 37;
  settle(following, messHall, aspect);
  assert.ok(Math.abs(visibleSpan(following, aspect)[1] - (messHall.room.width + wall)) < 1e-6, 'stops at the wall');
});

test('camera: room mode eases in when you enter a room, and stays inside the walls while it does', () => {
  const aspect = 16 / 9;
  const world = prisonWorld('mess-hall', 37.5);
  const framing = updateFraming(createFraming('room'), world, aspect, Infinity);
  const hall = world.room.portals.find((portal) => portal.id === 'mh-east');
  travel(world, hall);
  assert.equal(world.room.id, 'stairwell');
  updateFraming(framing, world, aspect, FRAME);
  const startDistance = framing.distance;
  const distances = [];
  for (let i = 0; i < 180; i += 1) {
    updateFraming(framing, world, aspect, FRAME);
    distances.push(framing.distance);
    const [left, right] = visibleSpan(framing, aspect);
    assert.ok(left >= -VIEW.wallThickness - 1e-6 && right <= world.room.width + VIEW.wallThickness + 1e-6);
  }
  assert.ok(distances[0] > startDistance && distances[0] < distances.at(-1), 'it pulls back over several frames');
  const whole = world.room.width / 2 + VIEW.wallThickness;
  assert.ok(Math.abs(halfView(distances.at(-1), aspect) - whole) < 0.05, 'and ends showing the whole room');
});

test('camera: close and wide jump straight to the player in a new room', () => {
  const world = prisonWorld('mess-hall', 37.5);
  const framing = updateFraming(createFraming('wide'), world, 16 / 9, Infinity);
  travel(world, world.room.portals.find((portal) => portal.id === 'mh-east'));
  const before = { ...updateFraming(framing, world, 16 / 9, FRAME) };
  updateFraming(framing, world, 16 / 9, FRAME);
  assert.equal(framing.x, before.x);
  assert.equal(framing.distance, VIEW.wideDistance);
});

test('camera: smart is wide while moving and closes in when you hide, are grabbed, or a guard is near', () => {
  const world = prisonWorld('cell-block', 2);
  guardById(world, 'cb-guard').x = 20;
  assert.equal(wantsTight(world), false);
  const framing = updateFraming(createFraming('smart'), world, 16 / 9, Infinity);
  assert.equal(framing.distance, VIEW.wideDistance);

  world.player.hiddenIn = 'cb-locker-1';
  assert.equal(wantsTight(world), true);
  settle(framing, world, 16 / 9);
  assert.ok(Math.abs(framing.distance - VIEW.closeDistance) < 0.01, 'eases in while hidden');
  world.player.hiddenIn = null;
  settle(framing, world, 16 / 9, 0.5);
  assert.ok(framing.distance < VIEW.closeDistance + 1, 'holds for a moment before pulling back');
  settle(framing, world, 16 / 9);
  assert.ok(Math.abs(framing.distance - VIEW.wideDistance) < 0.01, 'eases back out after');

  world.grab = { guardId: 'cb-guard', presses: 0, timeLeft: 3 };
  assert.equal(wantsTight(world), true);
  world.grab = null;

  world.player.x = 20 - VIEW.guardNearMetres + 0.1;
  assert.equal(wantsTight(world), true, 'a guard within a few metres');
  world.player.x = 20 - VIEW.guardNearMetres - 1;
  assert.equal(wantsTight(world, false), false);
  assert.equal(wantsTight(world, true), true, 'once close, he has to get further away before it pulls back');
  guardById(world, 'cb-guard').state = 'out';
  world.player.x = 20;
  assert.equal(wantsTight(world), false, 'a knocked-out guard does not count');
});

test('camera: the zoom key switches between close and wide in every mode', () => {
  for (const mode of ['close', 'wide', 'room']) {
    const framing = createFraming(mode);
    const first = framing.zoom;
    const second = toggleZoom(framing);
    assert.deepEqual([first, second].sort(), ['close', 'wide'], mode);
    assert.equal(toggleZoom(framing), first);
  }
  const smart = createFraming('smart');
  assert.deepEqual([toggleZoom(smart), toggleZoom(smart), toggleZoom(smart)], ['close', 'wide', 'auto']);
  const world = prisonWorld('mess-hall', 19);
  const framing = updateFraming(createFraming('close'), world, 16 / 9, Infinity);
  toggleZoom(framing);
  settle(framing, world, 16 / 9);
  assert.ok(Math.abs(framing.distance - VIEW.wideDistance) < 0.01);
});

test('camera: Z and a click of the left stick are the zoom buttons, and the pause menu names the mode', () => {
  assert.equal(intentFromKeys(new Set(['KeyZ'])).zoom, true);
  assert.equal(intentFromKeys(new Set(['KeyM'])).zoom, false);
  const buttons = Array.from({ length: 17 }, (_, index) => ({ pressed: index === 10, value: index === 10 ? 1 : 0 }));
  const pad = intentFromGamepad({ buttons, axes: [0, 0] });
  assert.equal(pad.zoom, true);
  const others = Object.entries(pad).filter(([name, value]) => name !== 'zoom' && value);
  assert.deepEqual(others, [], 'the stick click does nothing else');

  assert.equal(framingLabel(createFraming('close')), 'close');
  assert.equal(framingLabel(createFraming('room')), 'room');
  assert.equal(framingLabel(createFraming('smart')), 'smart');
  const zoomed = createFraming('room');
  toggleZoom(zoomed);
  assert.equal(framingLabel(zoomed), 'room (zoomed close)');
});

// ---------- Timer cues ----------

test('PA: the announcements and the time left when each one plays', () => {
  assert.deepEqual(announcements().map((entry) => [entry.at, entry.text]), [
    [300, 'Headcount in 5 minutes'],
    [218, 'Bed check'],
    [120, 'Headcount in 2 minutes'],
    [60, 'Headcount in 1 minute'],
  ]);
  const bedCheck = announcements().find((entry) => entry.id === 'bed-check');
  assert.equal(bedCheck.at, CONFIG.bedCheckAtSecondsRemaining + CONFIG.pa.bedCheckWarningSeconds);
});

test('PA: each announcement plays once, at its time, as text and as a sound event', () => {
  for (const { at, text } of announcements()) {
    const world = createWorld();
    world.timeLeft = at + 0.5;
    run(world, {}, 0.4);
    assert.equal(currentAnnouncement(world), null, `${text}: not early`);
    run(world, {}, 0.2);
    assert.equal(currentAnnouncement(world), text);
    run(world, {}, 2);
    const played = world.events.filter((event) => event.type === 'pa');
    assert.deepEqual(played.map((event) => event.text), [text]);
    run(world, {}, CONFIG.pa.showSeconds);
    assert.equal(currentAnnouncement(world), null, `${text}: gone after a few seconds`);
  }
});

test('PA: a whole run plays all four, in order, and the run is 7:00 long', () => {
  assert.equal(CONFIG.headcountSeconds, 420);
  const world = createWorld();
  assert.equal(world.timeLeft, 420);
  const heard = [];
  // Stay in bed for the whole run. No keycard, so it ends at 0:00.
  while (!world.over) {
    run(world, {}, 1);
    heard.push(...world.events.filter((event) => event.type === 'pa').map((event) => event.text));
    world.events.length = 0;
  }
  assert.deepEqual(heard, announcements().map((entry) => entry.text));
  assert.ok(Math.abs(world.time - 420) < 1.01);
});

test('last minute: the tick starts at 1:00 and speeds up twice', () => {
  assert.equal(tickInterval(61), 0);
  assert.equal(tickInterval(45), 1);
  assert.equal(tickInterval(20), 0.5);
  assert.equal(tickInterval(5), 0.25);
  assert.equal(tickInterval(0), 0);
  const ticksIn = (from, seconds) => {
    const world = createWorld();
    world.timeLeft = from;
    run(world, {}, seconds);
    return eventTypes(world).filter((type) => type === 'clockTick').length;
  };
  assert.equal(ticksIn(70.4, 5), 0);
  assert.equal(ticksIn(50.4, 5), 5);
  assert.equal(ticksIn(25.4, 5), 10);
  assert.equal(ticksIn(8.4, 5), 20);
});

test('debug timer keys still play the announcement they skip over', () => {
  const world = createWorld();
  world.timeLeft = 130;
  jumpTimer(world, -30);
  assert.equal(world.timeLeft, 100);
  assert.equal(currentAnnouncement(world), 'Headcount in 2 minutes');
  jumpTimer(world, 30);
  assert.equal(world.timeLeft, 130);
});

test('wall clocks: every room has one, never more than a screen apart, clear of cameras and high vents', () => {
  for (const room of Object.values(PRISON.rooms)) {
    const xs = wallClockXs(room);
    assert.ok(xs.length >= 1, room.id);
    assert.ok(room.width / xs.length <= CONFIG.pa.clockSpacing, room.id);
    for (const x of xs) {
      assert.ok(x > 0.75 && x < room.width - 0.75, `${room.id}: on the wall`);
      for (const camera of room.cameras ?? []) {
        assert.ok(Math.abs(x - (camera.min + camera.max) / 2) >= CONFIG.pa.clockClearance, room.id);
      }
      for (const portal of (room.portals ?? []).filter((entry) => entry.high)) {
        assert.ok(Math.abs(x - portal.x) >= CONFIG.pa.clockClearance, room.id);
      }
    }
  }
});

// ---------- Silent alarm ----------

function atDesk() {
  return prisonWorld('guard-office', 10.5);
}
const liftCard = (world) => run(world, { interact: true }, CONFIG.hold.slowSeconds + 0.1);

test('silent alarm reason: a camera saw you earlier, and it names the room', () => {
  const world = prisonWorld('stairwell', 16.5);
  run(world, {}, 1);
  assert.equal(world.seenByCamera, true);
  assert.equal(world.cameraSawIn, 'Stairwell Checkpoint');
  assert.equal(silentAlarmReason(world), null, 'no reason until it fires');
  world.player.x = 24;
  run(world, { up: true }, CONFIG.hold.slowSeconds + 0.1);
  assert.equal(world.room.id, 'guard-office');
  world.player.x = 10.5;
  world.events.length = 0;
  liftCard(world);
  assert.equal(world.silentAlarm, true);
  assert.deepEqual(world.silentAlarmReasons, ['camera']);
  assert.equal(silentAlarmReason(world), 'a camera saw you earlier in the Stairwell Checkpoint');
  assert.ok(eventTypes(world).includes('silentAlarm'), 'there is a sound');
  assert.match(world.message.text, /^SILENT ALARM: a camera saw you earlier in the Stairwell Checkpoint\./);
  assert.ok(world.message.until - world.time > 5, 'the message stays up long enough to read');
});

test('silent alarm reason: the office guard was knocked out', () => {
  const world = prisonWorld('guard-office', 13);
  knock(world);
  world.player.x = 10.5;
  liftCard(world);
  assert.deepEqual(world.silentAlarmReasons, ['knockout']);
  assert.equal(silentAlarmReason(world), 'the office guard was knocked out');
  assert.match(world.message.text, /SILENT ALARM: the office guard was knocked out/);
});

test('silent alarm reason: both at once are both named', () => {
  const world = prisonWorld('guard-office', 13);
  world.seenByCamera = true;
  knock(world);
  world.player.x = 10.5;
  liftCard(world);
  assert.equal(silentAlarmReason(world), 'a camera saw you earlier, and the office guard was knocked out');
});

test('no silent alarm: no reason, no message', () => {
  const world = atDesk();
  liftCard(world);
  assert.equal(world.silentAlarm, false);
  assert.equal(silentAlarmReason(world), null);
  assert.equal(world.message, null);
});

// ---------- Score screen ----------

test('score: silent alarm and why, how the keycard was taken, and the room you were caught in', () => {
  const world = atDesk();
  world.seenByCamera = true;
  tap(world, 'interact');
  assert.equal(world.keycardGrab, 'fast');
  // Wait for the guard to wake and grab, lose the mash, and get grabbed again.
  // The trip to solitary has already been used up.
  world.solitary.used = true;
  world.breakFreeUsed = true;
  run(world, {}, 12);
  assert.equal(world.over, 'caught');
  const { result } = world;
  assert.equal(result.silentAlarm, true);
  assert.equal(result.silentAlarmReason, 'a camera saw you earlier');
  assert.equal(result.keycardGrab, 'fast');
  assert.equal(result.caughtIn, 'Guard Office');
  assert.equal(result.endedIn, 'Guard Office');
});

test('score: a clean win says slow keycard, no silent alarm, and no caught room', () => {
  const world = atDesk();
  liftCard(world);
  world.over = null;
  world.timeLeft = 0.05;
  world.player.hiddenIn = 'bed';
  run(world, {}, 0.2);
  assert.equal(world.over, 'win');
  assert.equal(world.result.keycardGrab, 'slow');
  assert.equal(world.result.silentAlarm, false);
  assert.equal(world.result.silentAlarmReason, null);
  assert.equal(world.result.caughtIn, null);
});

test('score: a run that ends before the keycard is taken says so', () => {
  const world = prisonWorld('mess-hall', 10);
  world.timeLeft = 0.05;
  run(world, {}, 0.2);
  assert.equal(world.over, 'headcount');
  assert.equal(world.result.keycardGrab, null);
  assert.equal(world.result.endedIn, 'Mess Hall');
  assert.equal(world.result.caughtIn, null, 'out of bed at headcount is not "caught in"');
});

test('the playtest text carries the new score lines', () => {
  const result = {
    won: false, rank: 'caught', timeLeft: 377, timesSpotted: 2, knockouts: 3, bodiesFound: 0,
    silentAlarm: true, silentAlarmReason: 'the office guard was knocked out', keycardGrab: 'slow',
    caughtIn: 'Cell Block',
  };
  const text = playtestText(result, []);
  assert.match(text, /Keycard: taken slowly\. Silent alarm: yes, the office guard was knocked out\./);
  assert.match(text, /Caught in: Cell Block\./);
});
