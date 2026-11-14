// The gym's tuning panel (debug mode only): sliders for the movement numbers, changed live.
import { SLIDERS, movesFromSliders, slidersFromMoves, tuningText } from '../game/tuning.js';

// onChange is called with the new movement numbers every time a slider moves.
export function createTuningPanel(baseMoves, onChange) {
  const panel = document.getElementById('gym-tuning');
  const values = slidersFromMoves(baseMoves);
  const output = document.createElement('textarea');
  output.rows = 6;
  output.readOnly = true;

  function refresh() {
    const moves = movesFromSliders(values, baseMoves);
    output.value = tuningText(moves);
    onChange(moves);
  }

  const title = document.createElement('strong');
  title.textContent = 'GYM TUNING (changes at once)';
  panel.append(title);
  const inputs = [];
  for (const slider of SLIDERS) {
    const row = document.createElement('label');
    const name = document.createElement('span');
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min: slider.min, max: slider.max, step: slider.step });
    input.value = values[slider.id];
    const show = () => { name.textContent = `${slider.label}: ${values[slider.id]} ${slider.unit}`; };
    show();
    input.addEventListener('input', () => {
      values[slider.id] = Number(input.value);
      show();
      refresh();
    });
    // Give the keyboard back to the game as soon as the slider is let go.
    input.addEventListener('change', () => input.blur());
    inputs.push({ slider, input, show });
    row.append(name, input);
    panel.append(row);
  }

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copy values';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      copy.textContent = 'Copied';
    } catch {
      // Copying is blocked in some browsers. The text is in the box to select by hand.
      output.select();
    }
    copy.blur();
  });
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset';
  reset.addEventListener('click', () => {
    Object.assign(values, slidersFromMoves(baseMoves));
    for (const { slider, input, show } of inputs) {
      input.value = values[slider.id];
      show();
    }
    refresh();
    reset.blur();
  });
  panel.append(copy, reset, output);
  refresh();
  return { setVisible: (visible) => { if (panel.hidden === visible) panel.hidden = !visible; } };
}
