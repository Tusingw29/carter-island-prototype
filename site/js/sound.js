// Simple beeps made with Web Audio. No sound files.
// Each cue is a list of notes: [frequency in Hz, start in seconds, length in seconds, wave shape, loudness].
// Loudness is optional: 1 is normal.
const CUES = {
  suspicious: [[440, 0, 0.09, 'triangle'], [620, 0.1, 0.14, 'triangle']],
  // The alert sting.
  alert: [[880, 0, 0.08, 'square'], [880, 0.11, 0.08, 'square'], [1100, 0.22, 0.22, 'square']],
  searching: [[330, 0, 0.12, 'triangle'], [300, 0.14, 0.2, 'triangle']],
  calm: [[520, 0, 0.1, 'sine'], [390, 0.12, 0.22, 'sine']],
  knockout: [[110, 0, 0.16, 'sine'], [70, 0.05, 0.2, 'sine']],
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
  keycard: [[660, 0, 0.08, 'triangle'], [990, 0.09, 0.2, 'triangle']],
  silentAlarm: [[220, 0, 0.5, 'sawtooth'], [208, 0.25, 0.6, 'sawtooth']],
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

  function note(frequency, start, length, shape, loudness = 1) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const begin = context.currentTime + start;
    oscillator.type = shape;
    oscillator.frequency.value = frequency;
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
