// Browser review controller: reads visible HUD/debug text and sends keyboard events only.
// Set ?review=rush, force, or vent. Debug links are used to expose observations, not to grant tools.
(() => {
  const mode = new URLSearchParams(location.search).get('review') ?? 'rush';
  const held = new Set();
  const names = { 'Cell Block': 'cell', 'Mess Hall': 'mess', 'Stairwell Checkpoint': 'stairs',
    'Guard Office': 'office', Laundry: 'laundry', 'Maintenance Hall': 'maintenance', 'Vent Duct': 'duct' };
  const record = window.nov16Review = { mode, transitions: [], stopped: false, snapshots: [] };
  let frame = 0;
  let lastRoom = '';
  let screwdriver = false;
  const started = performance.now();
  function send(keys) {
    for (const code of held) if (!keys.includes(code)) {
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); held.delete(code);
    }
    for (const code of keys) if (!held.has(code)) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })); held.add(code);
    }
  }
  function stop(reason) {
    record.stopped = true;
    record.reason = reason;
    record.final = document.body.innerText;
    record.build = document.querySelector('meta[name="build"]')?.content;
    send([]);
  }
  function loop() {
    if (record.stopped) return;
    frame += 1;
    const panel = document.getElementById('debug-panel')?.textContent ?? '';
    const body = document.body.innerText;
    const match = panel.match(/player\s+(\w+)\s+[\d.]+ m\/s\s+x ([\d.]+)\s+y ([\d.]+)/);
    if (!match) { requestAnimationFrame(loop); return; }
    const x = Number(match[2]);
    const roomName = panel.match(/room\s+([^\n]+)/)?.[1]?.trim();
    const room = names[roomName];
    if (roomName !== lastRoom) {
      record.transitions.push({ room: roomName, x, ms: Math.round(performance.now() - started) });
      lastRoom = roomName;
    }
    const end = document.getElementById('end-screen');
    if (end && !end.hidden) { stop('game ended'); return; }
    if (performance.now() - started > 180000) { stop('browser observation limit'); return; }
    const tap = frame % 2 === 0;
    const card = document.getElementById('keycard')?.hidden === false;
    const hidden = panel.match(/^hidden[ \t]+([^\n]+)/m)?.[1]?.trim();
    const prompt = document.getElementById('prompt-text')?.textContent ?? '';
    let keys = [];
    let target = 0;
    let action = 'up';
    if (body.includes('GRABBED!')) keys = tap ? ['Space'] : [];
    else if (document.getElementById('takedown')?.hidden === false) keys = tap ? ['Space'] : [];
    else if (body.includes('SOLITARY.') || body.includes('A guard walks you')) keys = tap ? ['KeyE'] : [];
    else if (hidden === 'bed') keys = card ? (tap ? ['KeyE'] : []) : (tap ? ['KeyW'] : []);
    else {
      if (card) {
        if (room === 'cell') { target = 4.5; action = 'bed'; }
        else if (room === 'office') target = 19.5;
      } else if (mode === 'vent') {
        if (room === 'cell') target = 1.3;
        if (room === 'laundry') {
          if (!screwdriver && /Screwdriver\. Now/.test(body)) screwdriver = true;
          target = screwdriver ? 26.5 : 23.8;
          action = screwdriver ? 'up' : 'item';
        }
        if (room === 'maintenance') target = 23;
        if (room === 'duct') target = 28.5;
        if (room === 'office') { target = 10.5; action = 'item'; }
      } else {
        if (room === 'cell') { target = 29.5; action = 'hall'; }
        if (room === 'mess') { target = 37.5; action = 'hall'; }
        if (room === 'stairs') target = 24;
        if (room === 'office') { target = 10.5; action = 'item'; }
      }
      if (Math.abs(target - x) > (action === 'hall' ? 0.01 : 0.4)) {
        keys = [target > x ? 'KeyD' : 'KeyA'];
        if (room !== 'duct') keys.push('ShiftLeft');
      } else if (action === 'hall') keys = [target > x ? 'KeyD' : 'KeyA', 'ShiftLeft'];
      else keys = tap ? [action === 'item' ? 'KeyE' : 'KeyW'] : [];
      if (mode === 'force') {
        if (/^SPACE: grab/.test(prompt)) keys = tap ? ['Space'] : [];
        else if (/or SPACE: grab/.test(prompt)) {
          const guards = [...panel.matchAll(/^(\S+)\s+alert\s+sees [Yn]\s+\d+%\s+x ([\d.]+)/gm)]
            .map((g) => ({ x: Number(g[2]) })).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));
          if (guards[0]) keys = [guards[0].x > x ? 'KeyD' : 'KeyA', 'ShiftLeft'];
        }
        else if (/R: shove/.test(prompt)) keys.push(...(tap ? ['KeyR'] : []));
      }
    }
    if (frame % 60 === 0 && record.snapshots.length < 120) {
      record.snapshots.push({ ms: Math.round(performance.now() - started), room: roomName,
        player: match[0], prompt });
    }
    send(keys);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
