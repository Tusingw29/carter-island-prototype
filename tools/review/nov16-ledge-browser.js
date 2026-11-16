// Live debug-spawn fixture. Keyboard only: jump to draw a glance, then shove toward the ledge.
(() => {
  const r = window.nov16Ledge = { samples: [], pressed: null };
  let first = null;
  let jumpAt = null;
  let shovedAt = null;
  let frame = 0;
  const send = (code, type) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  function loop(now) {
    const panel = document.getElementById('debug-panel')?.textContent ?? '';
    if (!/room\s+Yard/.test(panel)) { requestAnimationFrame(loop); return; }
    first ??= now;
    frame += 1;
    const prompt = document.getElementById('prompt-text')?.textContent ?? '';
    if (now - first > 2000 && jumpAt === null) { send('KeyK', 'keydown'); jumpAt = frame; }
    if (jumpAt !== null && frame > jumpAt + 5) send('KeyK', 'keyup');
    if (/R: shove off/.test(prompt) && shovedAt === null) {
      send('KeyR', 'keydown'); shovedAt = frame; r.pressed = prompt;
    }
    if (shovedAt !== null && frame > shovedAt + 5) send('KeyR', 'keyup');
    if (frame % 5 === 0) r.samples.push({ ms: Math.round(now - first), prompt, panel });
    if (now - first < 12000) requestAnimationFrame(loop);
    else { send('KeyR', 'keyup'); send('KeyK', 'keyup'); r.final = document.body.innerText; }
  }
  requestAnimationFrame(loop);
})();
