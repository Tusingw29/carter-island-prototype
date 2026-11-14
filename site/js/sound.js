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
  caught: [[400, 0, 0.2, 'sawtooth'], [300, 0.2, 0.2, 'sawtooth'], [180, 0.4, 0.5, 'sawtooth']],
  hide: [[240, 0, 0.05, 'sine']],
  unhide: [[300, 0, 0.05, 'sine']],
  stuff: [[160, 0, 0.1, 'sine']],
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
