// Simple beeps made with Web Audio. No sound files.
// Each cue is a list of notes: [frequency in Hz, start in seconds, length in seconds, wave shape].
const CUES = {
  suspicious: [[440, 0, 0.09, 'triangle'], [620, 0.1, 0.14, 'triangle']],
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
  door: [[180, 0, 0.08, 'sine']],
  doorLoud: [[90, 0, 0.25, 'sawtooth'], [140, 0.05, 0.3, 'square']],
  camera: [[1300, 0, 0.06, 'square'], [1300, 0.12, 0.06, 'square']],
  keycard: [[660, 0, 0.08, 'triangle'], [990, 0.09, 0.2, 'triangle']],
  silentAlarm: [[220, 0, 0.5, 'sawtooth'], [208, 0.25, 0.6, 'sawtooth']],
  win: [[523, 0, 0.12, 'triangle'], [659, 0.13, 0.12, 'triangle'], [784, 0.26, 0.3, 'triangle']],
  lose: [[300, 0, 0.2, 'sawtooth'], [200, 0.2, 0.5, 'sawtooth']],
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

  function note(frequency, start, length, shape) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const begin = context.currentTime + start;
    oscillator.type = shape;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(VOLUME, begin);
    gain.gain.exponentialRampToValueAtTime(0.001, begin + length);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(begin);
    oscillator.stop(begin + length + 0.02);
  }

  function play(name) {
    if (!context || context.state !== 'running' || !CUES[name]) return;
    for (const [frequency, start, length, shape] of CUES[name]) note(frequency, start, length, shape);
  }

  // Plays one cue per kind of event, so two guards going Alert at once is one sting, not two.
  function playEvents(events) {
    for (const type of new Set(events.map((event) => event.type))) play(type);
  }
  return { play, playEvents };
}
