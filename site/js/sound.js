// Simple beeps made with Web Audio. No sound files.
// Each cue is a list of notes: [frequency in Hz, start in seconds, length in seconds, wave shape, loudness,
// end frequency]. Loudness is optional: 1 is normal. With an end frequency the note slides to it.
const CUES = {
  suspicious: [[440, 0, 0.09, 'triangle'], [620, 0.1, 0.14, 'triangle']],
  // The alert sting.
  alert: [[880, 0, 0.08, 'square'], [880, 0.11, 0.08, 'square'], [1100, 0.22, 0.22, 'square']],
  searching: [[330, 0, 0.12, 'triangle'], [300, 0.14, 0.2, 'triangle']],
  calm: [[520, 0, 0.1, 'sine'], [390, 0.12, 0.22, 'sine']],
  // A thud: a low note that drops fast, with a click on top so it lands.
  knockout: [[160, 0, 0.22, 'sine', 3, 45], [90, 0, 0.3, 'triangle', 2.2, 35], [420, 0, 0.03, 'square', 0.8]],
  // The chase: a rising whine as a guard winds up a lunge, a scuff when he misses, and a dull
  // double buzz when a knockout is refused.
  lunge: [[220, 0, 0.3, 'sawtooth', 0.8, 660]],
  lungeMiss: [[180, 0, 0.18, 'sawtooth', 0.7, 70]],
  tooRisky: [[150, 0, 0.07, 'square', 0.8], [150, 0.1, 0.07, 'square', 0.8]],
  // A shove: a lighter thud than a knockout. A throw: a short whoosh. Then it lands with a
  // clatter, or hits a head with a hollow knock.
  shove: [[190, 0, 0.14, 'sine', 2, 70], [380, 0, 0.03, 'square', 0.6]],
  throw: [[500, 0, 0.14, 'sine', 0.5, 900]],
  clatter: [[1400, 0, 0.04, 'square', 0.7], [900, 0.06, 0.05, 'square', 0.6], [1200, 0.14, 0.04, 'square', 0.4]],
  bonk: [[520, 0, 0.09, 'sine', 1.6, 260], [1100, 0, 0.02, 'square', 0.5]],
  finish: [
    [523, 0, 0.1, 'triangle'], [659, 0.1, 0.1, 'triangle'], [784, 0.2, 0.1, 'triangle'], [1047, 0.3, 0.3, 'triangle'],
  ],
  // Radio: two short blips of static-like tone. A missed check-in is the same, lower and longer.
  checkIn: [[1800, 0, 0.03, 'square', 0.35], [1350, 0.05, 0.05, 'square', 0.35]],
  missedCheckIn: [
    [1800, 0, 0.03, 'square', 0.5], [600, 0.08, 0.3, 'sawtooth', 0.6], [500, 0.42, 0.4, 'sawtooth', 0.6],
  ],
  // A guard waking up: banging on a locker door, a groan as he stirs, and getting to his feet.
  bang: [[85, 0, 0.12, 'square', 2.4, 50], [300, 0, 0.03, 'square', 0.8]],
  stir: [[150, 0, 0.35, 'sawtooth', 0.5, 110]],
  wake: [[200, 0, 0.12, 'sawtooth', 0.8], [300, 0.12, 0.2, 'sawtooth', 0.8]],
  // Gym moves.
  jump: [[300, 0, 0.09, 'square', 0.4, 520]],
  land: [[110, 0, 0.07, 'sine', 1.2, 60]],
  dash: [[700, 0, 0.16, 'sawtooth', 0.9, 180], [90, 0, 0.12, 'square', 1.2]],
  slide: [[220, 0, 0.3, 'sawtooth', 0.25, 120]],
  fell: [[400, 0, 0.4, 'sine', 0.8, 80]],
  // Takedowns: the grab, him talking, being thrown down, breaking free, and a faked check-in.
  grabGuard: [[130, 0, 0.1, 'sine', 1.6, 80], [300, 0, 0.03, 'square', 0.4]],
  talk: [[330, 0, 0.08, 'triangle', 0.6], [392, 0.1, 0.08, 'triangle', 0.6], [330, 0.2, 0.14, 'triangle', 0.6]],
  slam: [[120, 0, 0.3, 'sine', 3.4, 35], [70, 0, 0.35, 'triangle', 2.6, 30], [500, 0, 0.04, 'square', 1]],
  brokeFree: [[400, 0, 0.08, 'sawtooth', 0.9, 700], [700, 0.08, 0.12, 'sawtooth', 0.9]],
  checkInFaked: [
    [1800, 0, 0.03, 'square', 0.35], [1350, 0.05, 0.05, 'square', 0.35], [1800, 0.14, 0.05, 'square', 0.3],
  ],
  // A guard half hearing something.
  glance: [[500, 0, 0.06, 'triangle', 0.35]],
  bodyFound: [[700, 0, 0.3, 'sawtooth']],
  grab: [[150, 0, 0.3, 'sawtooth']],
  free: [[300, 0, 0.07, 'square'], [500, 0.08, 0.07, 'square'], [800, 0.16, 0.14, 'square']],
  hide: [[240, 0, 0.05, 'sine']],
  unhide: [[300, 0, 0.05, 'sine']],
  stuff: [[160, 0, 0.1, 'sine']],
  stairs: [[200, 0, 0.05, 'sine'], [170, 0.08, 0.05, 'sine']],
  vent: [[320, 0, 0.04, 'square'], [260, 0.06, 0.04, 'square'], [120, 0.14, 0.12, 'sine']],
  pickup: [[700, 0, 0.06, 'triangle'], [900, 0.07, 0.12, 'triangle']],
  locked: [[140, 0, 0.08, 'square'], [140, 0.12, 0.08, 'square']],
  yell: [[520, 0, 0.12, 'sawtooth'], [640, 0.1, 0.12, 'sawtooth'], [520, 0.22, 0.2, 'sawtooth']],
  bedCheck: [[440, 0, 0.15, 'triangle'], [440, 0.3, 0.15, 'triangle'], [440, 0.6, 0.15, 'triangle']],
  lockdown: [
    [880, 0, 0.15, 'square'], [660, 0.18, 0.15, 'square'], [880, 0.36, 0.15, 'square'], [660, 0.54, 0.3, 'square'],
  ],
  panel: [[500, 0, 0.05, 'square'], [300, 0.08, 0.12, 'square']],
  hint: [[600, 0, 0.08, 'sine'], [760, 0.1, 0.16, 'sine']],
  dummy: [[200, 0, 0.1, 'sine']],
  cellOpen: [[260, 0, 0.06, 'square'], [200, 0.1, 0.2, 'sawtooth']],
  // A quiet door: one soft click. A slammed creaky door: a groan and a bang.
  door: [[180, 0, 0.08, 'sine']],
  doorLoud: [[620, 0, 0.18, 'sawtooth', 0.7], [90, 0.16, 0.25, 'sawtooth', 1.4], [140, 0.2, 0.3, 'square']],
  // Played over and over while a creaky door is being eased open.
  creak: [[410, 0, 0.09, 'sawtooth', 0.25], [370, 0.08, 0.12, 'sawtooth', 0.2]],
  camera: [[1300, 0, 0.06, 'square'], [1300, 0.12, 0.06, 'square']],
  // Caught in a searchlight: a rising two-note horn. Its lamp going out: a falling hum.
  searchlight: [[440, 0, 0.18, 'sawtooth', 1.1, 660], [660, 0.2, 0.3, 'sawtooth', 1.1]],
  lightOut: [[300, 0, 0.5, 'sine', 1, 60]],
  keycard: [[660, 0, 0.08, 'triangle'], [990, 0.09, 0.2, 'triangle']],
  // Three low pulses and a long drone: unlike anything else, so you know something changed.
  silentAlarm: [
    [196, 0, 0.18, 'sawtooth', 1.3], [196, 0.26, 0.18, 'sawtooth', 1.3], [196, 0.52, 0.18, 'sawtooth', 1.3],
    [147, 0.8, 1.1, 'sawtooth', 1.2], [139, 0.8, 1.1, 'sawtooth', 0.8],
  ],
  // The PA: a two-tone chime, like a public address system switching on.
  pa: [[784, 0, 0.3, 'sine', 1.4], [587, 0.32, 0.6, 'sine', 1.4]],
  // The clock in the last minute.
  clockTick: [[1500, 0, 0.03, 'square', 0.5], [900, 0.03, 0.03, 'square', 0.3]],
  win: [[523, 0, 0.12, 'triangle'], [659, 0.13, 0.12, 'triangle'], [784, 0.26, 0.3, 'triangle']],
  lose: [[300, 0, 0.2, 'sawtooth'], [200, 0.2, 0.5, 'sawtooth']],
  // Footsteps: walking is a soft tap, running a heavier thud. Crouching makes none.
  step: [[95, 0, 0.05, 'sine', 0.5]],
  stepRun: [[120, 0, 0.06, 'triangle', 1.2], [70, 0.02, 0.07, 'sine', 1]],
  // One minute left, then the last ten seconds.
  timerWarning: [[990, 0, 0.12, 'square'], [990, 0.25, 0.12, 'square'], [990, 0.5, 0.25, 'square']],
  timerTick: [[1200, 0, 0.04, 'square', 0.6]],
};
const VOLUME = 0.12;

export function createSound() {
  let context = null;

  // Browsers only allow sound after the player has pressed something.
  function unlock() {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!context && AudioContext) context = new AudioContext();
    if (context?.state === 'suspended') context.resume();
  }
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('gamepadconnected', unlock);

  function note(frequency, start, length, shape, loudness = 1, endFrequency = null) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const begin = context.currentTime + start;
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(frequency, begin);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, begin + length);
    gain.gain.setValueAtTime(VOLUME * loudness, begin);
    gain.gain.exponentialRampToValueAtTime(0.001, begin + length);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(begin);
    oscillator.stop(begin + length + 0.02);
  }

  function play(name) {
    if (!context || context.state !== 'running' || !CUES[name]) return;
    for (const args of CUES[name]) note(...args);
  }

  // Plays one cue per kind of event, so two guards going Alert at once is one sting, not two.
  function playEvents(events) {
    for (const type of new Set(events.map((event) => event.type))) play(type);
  }
  return { play, playEvents, unlock };
}

// Sounds that follow what the player is doing from moment to moment, not single events.
export function createMovementSounds(sound) {
  const STRIDE = { walk: 0.95, run: 1.5 };
  const CREAK_EVERY = 0.4;
  let walked = 0;
  let creakIn = 0;

  function update(world, dt) {
    const { player } = world;
    const stride = STRIDE[player.mode];
    if (stride && !world.room.crawl) {
      walked += player.speed * dt;
      if (walked >= stride) {
        walked = 0;
        sound.play(player.mode === 'run' ? 'stepRun' : 'step');
      }
    } else {
      walked = 0;
    }
    // A creaky door being opened slowly still makes a little noise for the player to hear.
    const easing = world.holds.up && world.holds.up.time > 0.25;
    creakIn = easing ? creakIn - dt : 0;
    if (easing && creakIn <= 0) {
      creakIn = CREAK_EVERY;
      sound.play('creak');
    }
  }
  return { update };
}
